// services/aiParser.ts
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface AIParsingResult {
  passengerName: string;
  flights: Array<{
    airlineCode: string;
    airlineName: string;
    flightNumber: string;
    cabinClass: string;
    cabinClassName: string;
    departureDate: string;
    departureAirport: string;
    departureCity: string;
    arrivalAirport: string;
    arrivalCity: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    overnight: boolean;
    confirmationStatus?: string;
  }>;
  totalAmount: number;
  currency: string;
  bookingReference?: string;
  pnr: string;
  bookingDate?: string;
  summary: string;
  friendlySummary: string;
}

export async function parseTravelWithAI(rawText: string): Promise<AIParsingResult> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key not found in environment variables');
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
  const currentDate = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const systemPrompt = `You are an expert airline booking parser specializing in GDS formats.

CRITICAL: Return ONLY valid JSON with NO markdown, NO code blocks, NO explanatory text.

CURRENT DATE: ${currentDate}
- When dates show only day+month (e.g., "17OCT"), use ${currentYear} if month hasn't passed, otherwise ${currentYear + 1}
- Format as "Month Day, Year" (e.g., "October 17, ${currentYear}")

PNR EXTRACTION (MOST IMPORTANT):
The PNR is the FIRST alphanumeric code at the very beginning of the booking.
Examples:
- "DQVJ6T/SC NBOOU" → PNR is "DQVJ6T"
- "DPRDPT/SC NBOOU" → PNR is "DPRDPT"
- "ABC123/XX" → PNR is "ABC123"

DO NOT confuse PNR with:
- Agent codes (appear after with "AG" like "39K8SC AG")
- Office IDs (like "NBOOU")
- Ticket numbers (long numeric strings)

PASSENGER NAMES:
- Extract ALL passenger names from the booking
- Combine multiple passengers into one string like: "SURNAME/GIVEN NAME & SURNAME/GIVEN NAME (INFANT)"
- Look for patterns like:
  * "1.1AYII/AWAK TEREZA GHEW"
  * "2.I/1LUAL/DENG ABIGAIL AMOL MS*11JUL25" (the "I/" or "*DATE" indicates INFANT)
- Format as: "AYII/AWAK TEREZA GHEW & LUAL/DENG ABIGAIL AMOL (Infant)"

FLIGHT PARSING:
GDS format example: "UR 121 K 17OCT JUBEBB HK1 1410 1635"
- Airline: UR
- Flight: 121
- Class: K
- Date: 17OCT
- Route: JUBEBB means JUB→EBB
- Status: HK1 (confirmed)
- Times: 1410-1635 (24hr format, convert to 12hr with AM/PM)

CABIN CLASSES:
F/A=First, J/C=Business, W=Premium Economy, Y/B/H/K/L/M/Q/T/E/N=Economy

AIRPORTS & AIRLINES:
- JUB = Juba, South Sudan
- EBB = Entebbe, Uganda
- NBO = Nairobi, Kenya
- ADD = Addis Ababa, Ethiopia
- UR = Uganda Airlines
- ET = Ethiopian Airlines
- KQ = Kenya Airways

PRICING:
- Extract total amount from lines like "TOTAL USD783.00 ADULT"
- Look for currency (USD, EUR, KES, etc.)
- Sum all passenger totals

JSON FORMAT (return exactly this):
{
  "passengerName": "SURNAME/GIVEN & SURNAME/GIVEN (Infant)",
  "flights": [
    {
      "airlineCode": "UR",
      "airlineName": "Uganda Airlines",
      "flightNumber": "UR121",
      "cabinClass": "K",
      "cabinClassName": "Economy Class",
      "departureDate": "October 17, ${currentYear}",
      "departureAirport": "JUB",
      "departureCity": "Juba, South Sudan",
      "arrivalAirport": "EBB",
      "arrivalCity": "Entebbe, Uganda",
      "departureTime": "2:10 PM",
      "arrivalTime": "4:35 PM",
      "duration": "2h 25m",
      "overnight": false,
      "confirmationStatus": "Confirmed"
    }
  ],
  "totalAmount": 933.00,
  "currency": "USD",
  "pnr": "DQVJ6T",
  "bookingDate": "October 15, ${currentYear}",
  "summary": "Round trip between Juba and Entebbe with 2 passengers (1 adult, 1 infant)",
  "friendlySummary": "✈️ Round trip to Entebbe with infant passenger"
}

VALIDATION:
- All times in 12-hour format with AM/PM
- All dates with full month name and year
- PNR must be 5-7 characters
- Currency must be 3-letter code
- Passenger names should include ALL travelers with designations (Adult/Infant/Child)`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Parse this GDS booking. Pay special attention to:
1. Extract PNR from the VERY FIRST code before any slash
2. Combine ALL passenger names into one string with designations (Adult/Infant/Child)
3. Parse ALL flights in the itinerary
4. Extract accurate pricing

Booking data:
${rawText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from AI');
    }

    // Clean response
    let cleanedContent = content.trim();
    cleanedContent = cleanedContent.replace(/```json\s*/g, '');
    cleanedContent = cleanedContent.replace(/```\s*/g, '');
    
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.error('Raw AI response:', content);
      throw new Error('No valid JSON object found in AI response');
    }
    
    cleanedContent = cleanedContent.substring(jsonStart, jsonEnd);

    try {
      const parsedResult: AIParsingResult = JSON.parse(cleanedContent);
      
      // Validation
      if (!parsedResult.pnr || parsedResult.pnr.length < 5) {
        console.warn('PNR seems invalid:', parsedResult.pnr);
      }
      
      if (!parsedResult.flights || parsedResult.flights.length === 0) {
        throw new Error('No flights found in booking');
      }
      
      return parsedResult;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Attempted to parse:', cleanedContent);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('AI Parsing Error:', error);
    throw new Error(`Failed to parse travel itinerary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}