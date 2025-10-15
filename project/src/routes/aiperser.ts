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
  }>;
  totalAmount: number;
  currency: string;
  bookingReference?: string;
  pnr?: string;
  summary: string;
  friendlySummary: string;
}

export async function parseTravelWithAI(rawText: string): Promise<AIParsingResult> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key not found in environment variables');
  }

  // Get current date info
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
  const currentDate = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const systemPrompt = `You are a world-class travel expert who can parse ANY airline itinerary format. 
Extract information intelligently and make reasonable assumptions.

CRITICAL: Return ONLY valid JSON, no other text.

CURRENT DATE CONTEXT:
- Today is: ${currentDate}
- Current year: ${currentYear}
- IMPORTANT: When parsing dates without a year, assume ${currentYear} if the month is ${currentMonth} or later
- If the month has already passed this year, assume the date is in ${currentYear + 1}
- Always use the format "Month Day, Year" (e.g., "January 15, ${currentYear}")

IMPORTANT PNR IDENTIFICATION RULES:
1. The PNR appears at the START of the booking record, often in format "PNR/XX" (like "DPRDPT/SC")
2. PNR is typically 6 alphanumeric characters (e.g., "DPRDPT", "ABC123", "39K8PV")
3. DO NOT confuse with:
   - Agent codes (like "39K8SC AG") - these appear AFTER the PNR with "AG" designation
   - Ticket numbers (long numeric strings like "7063511469621")
   - Office IDs or transaction codes
4. Look for the PNR at the beginning of lines like "XXXXX/XX NBOOU" or similar GDS formats
5. If you see "XXXXXX/XX" at the start, use only the first 6 characters before the slash as the PNR
6. The PNR typically appears BEFORE any location codes (like NBOOU) in the first line

When you see airline codes, make educated guesses based on:
- Common airline codes and their operators
- Regional context (African airlines for African routes, Asian for Asian routes, etc.)
- Your comprehensive knowledge of global aviation

For cabin classes:
F=First Class, J=Business Class, C=Business Class, W=Premium Economy, Y=Economy, K=Economy, E=Economy, D=Economy

For airport codes, provide both code and city/country.

Expected JSON format:
{
  "passengerName": "John Doe",
  "flights": [
    {
      "airlineCode": "UR",
      "airlineName": "Uganda Airlines",
      "flightNumber": "UR121",
      "cabinClass": "K", 
      "cabinClassName": "Economy Class",
      "departureDate": "October 10, ${currentYear}",
      "departureAirport": "JUB",
      "departureCity": "Juba, South Sudan",
      "arrivalAirport": "EBB",
      "arrivalCity": "Entebbe, Uganda",
      "departureTime": "2:10 PM",
      "arrivalTime": "4:35 PM",
      "duration": "2h 25m",
      "overnight": false
    }
  ],
  "totalAmount": 379.00,
  "currency": "USD",
  "pnr": "DPRDPT",
  "summary": "Direct flight from Juba to Nairobi in Economy Class",
  "friendlySummary": "✈️ Direct flight to Nairobi"
}

Rules:
- PNR is typically 6-character alphanumeric code at the START of the booking
- Extract PNR from patterns like "DPRDPT/SC NBOOU" (use "DPRDPT")
- Convert all times to 12-hour format with AM/PM
- Convert dates to full month names with year (October 20, ${currentYear})
- Calculate durations between departure and arrival times
- Detect overnight flights (when arrival time is earlier than departure time)
- Create human-readable summaries
- Be flexible with input formats
- Make intelligent guesses for airline names and cities`;

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
            content: `Parse this travel itinerary: ${rawText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from AI');
    }

    // Clean the response - remove markdown code blocks and any extra text
    let cleanedContent = content.trim();
    
    // Remove ```json and ``` markers
    cleanedContent = cleanedContent.replace(/```json\s*/g, '');
    cleanedContent = cleanedContent.replace(/```\s*/g, '');
    
    // Remove any text before the first { and after the last }
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON found in AI response');
    }
    
    cleanedContent = cleanedContent.substring(jsonStart, jsonEnd);

    // Parse the JSON response
    try {
      const parsedResult: AIParsingResult = JSON.parse(cleanedContent);
      return parsedResult;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Cleaned content that failed:', cleanedContent);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('AI Parsing Error:', error);
    throw new Error(`Failed to parse travel itinerary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}