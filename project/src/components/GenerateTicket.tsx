// components/TravelAgent.tsx
import { useState, useRef } from 'react';
import { 
  Plane, Ticket, Download, Upload, FileText, Calendar, 
  MapPin, User, Clock, CreditCard, Sparkles, Copy,
  ArrowRight, Globe, Building2, Luggage, Coffee,
  AlertCircle, Bell, Share2, CheckCircle, Loader2,
  Receipt
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { parseTravelWithAI, type AIParsingResult } from '../routes/aiperser';
import { supabase } from '../lib/supabase';

type TravelItinerary = AIParsingResult & {
  parsedSuccessfully: boolean;
  rawText: string;
};

interface TravelRecord {
  id?: string;
  passenger_name: string;
  pnr: string;
  departure_date: string;
  departure_time: string;
  departure_airport: string;
  arrival_airport: string;
  airline_name: string;
  flight_number: string;
  checkin_24h_alert: boolean;
  checkin_3h_alert: boolean;
  checkin_completed: boolean;
  created_at?: string;
  user_id?: string;
  raw_itinerary: string;
  contact_info?: string;
}

type ParsingState = 'idle' | 'starting' | 'preparing' | 'almost_there' | 'complete' | 'error';

export function TravelAgent() {
  const [inputText, setInputText] = useState('');
  const [itinerary, setItinerary] = useState<TravelItinerary | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsingState, setParsingState] = useState<ParsingState>('idle');
  const [generatingTicket, setGeneratingTicket] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedRecord, setSavedRecord] = useState<TravelRecord | null>(null);

  const resultsSectionRef = useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    setTimeout(() => {
      resultsSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    
    setParsing(true);
    setParsingState('starting');
    setError(null);
    
    try {
      setTimeout(() => setParsingState('preparing'), 1500);
      setTimeout(() => setParsingState('almost_there'), 4000);
      
      const aiResult = await parseTravelWithAI(inputText);
      
      setParsingState('complete');
      
      setTimeout(() => {
        const itinerary: TravelItinerary = {
          ...aiResult,
          parsedSuccessfully: true,
          rawText: inputText
        };

        setItinerary(itinerary);
        setParsing(false);
        setParsingState('idle');
        scrollToResults();
      }, 1500);
      
    } catch (error) {
      console.error('Smart Parsing Error:', error);
      setParsingState('error');
      setError(error instanceof Error ? error.message : 'Failed to parse itinerary');
      setItinerary(null);
      
      setTimeout(() => {
        setParsing(false);
        setParsingState('idle');
      }, 3000);
    }
  };

  const ParsingModal = () => {
    if (!parsing) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              <img src="../../public/Around-the-World--unscreen.gif" alt="Tuli Travel Logo" className=''></img>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Travel Assistant</h3>
            <p className="text-blue-100 text-sm">Analyzing your itinerary...</p>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div className={`flex items-center gap-4 transition-all duration-500 ${
                parsingState === 'starting' ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
              }`}>
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {parsingState === 'starting' ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : parsingState === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Initializing Smart Parser</p>
                  <p className="text-sm text-slate-500">Getting everything ready</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 transition-all duration-500 ${
                parsingState === 'preparing' ? 'opacity-100 scale-100' : 
                parsingState === 'almost_there' || parsingState === 'complete' ? 'opacity-60 scale-95' : 'opacity-40 scale-90'
              }`}>
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {parsingState === 'preparing' ? (
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  ) : parsingState === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Preparing Travel Card</p>
                  <p className="text-sm text-slate-500">Organizing flight details</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 transition-all duration-500 ${
                parsingState === 'almost_there' ? 'opacity-100 scale-100' : 
                parsingState === 'complete' ? 'opacity-60 scale-95' : 'opacity-40 scale-90'
              }`}>
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {parsingState === 'almost_there' ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : parsingState === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Almost There</p>
                  <p className="text-sm text-slate-500">Finalizing your itinerary</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 transition-all duration-500 ${
                parsingState === 'complete' ? 'opacity-100 scale-100' : 'opacity-40 scale-90'
              }`}>
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {parsingState === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 animate-bounce" />
                  ) : parsingState === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <div className="w-5 h-5 bg-slate-300 rounded-full"></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Ready to Go!</p>
                  <p className="text-sm text-slate-500">Your travel plan is ready</p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: 
                    parsingState === 'starting' ? '25%' :
                    parsingState === 'preparing' ? '50%' :
                    parsingState === 'almost_there' ? '75%' :
                    parsingState === 'complete' ? '100%' : '0%'
                }}
              ></div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-slate-600">
                {parsingState === 'starting' && "This may take a minute..."}
                {parsingState === 'preparing' && "Analyzing flight details..."}
                {parsingState === 'almost_there' && "Almost there! Finalizing..."}
                {parsingState === 'complete' && "Complete! Showing your results..."}
                {parsingState === 'error' && "Oops! Something went wrong..."}
              </p>
            </div>
          </div>

          {parsingState === 'error' && (
            <div className="bg-red-50 border-t border-red-200 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Parsing failed</p>
                  <p className="text-xs text-red-600 mt-1">Please try again or check your input</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const saveToSupabase = async () => {
    if (!itinerary || !itinerary.flights.length) return;
    
    setSaving(true);
    try {
      const travelRecords: Omit<TravelRecord, 'id' | 'created_at'>[] = itinerary.flights.map(flight => {
        return {
          passenger_name: itinerary.passengerName || 'Unknown Passenger',
          pnr: itinerary.pnr || 'UNKNOWN',
          departure_date: flight.departureDate,
          departure_time: flight.departureTime,
          departure_airport: flight.departureAirport,
          arrival_airport: flight.arrivalAirport,
          airline_name: flight.airlineName,
          flight_number: flight.flightNumber,
          checkin_24h_alert: false,
          checkin_3h_alert: false,
          checkin_completed: false,
          raw_itinerary: itinerary.rawText,
          contact_info: ''
        };
      });

      const { data, error } = await supabase
        .from('travel_records')
        .insert(travelRecords)
        .select();

      if (error) throw error;

      setSavedRecord(data[0]);
      
      data.forEach((record: TravelRecord) => {
        const departureDate = new Date(`${record.departure_date} ${record.departure_time}`);
        const checkin24hTime = new Date(departureDate.getTime() - (24 * 60 * 60 * 1000));
        const checkin3hTime = new Date(departureDate.getTime() - (3 * 60 * 60 * 1000));
        
        scheduleBrowserNotifications(record, checkin24hTime, checkin3hTime);
      });
      
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      setError('Failed to save travel record for reminders');
    } finally {
      setSaving(false);
    }
  };

  const scheduleBrowserNotifications = (record: TravelRecord, checkin24hTime: Date, checkin3hTime: Date) => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        const now = new Date();
        const timeUntil24h = checkin24hTime.getTime() - now.getTime();
        
        if (timeUntil24h > 0) {
          setTimeout(() => {
            new Notification('✈️ Check-in Reminder - 24 Hours', {
              body: `Check-in opens for ${record.passenger_name} on ${record.airline_name} ${record.flight_number}`,
              icon: '/TULI TRAVEL LOGO.png',
              tag: 'checkin-24h'
            });
            
            supabase
              .from('travel_records')
              .update({ checkin_24h_alert: true })
              .eq('id', record.id);
              
          }, timeUntil24h);
        }

        const timeUntil3h = checkin3hTime.getTime() - now.getTime();
        if (timeUntil3h > 0) {
          setTimeout(() => {
            new Notification('🛄 Check-in Reminder - 3 Hours', {
              body: `Check-in closing soon for ${record.passenger_name} on ${record.airline_name} ${record.flight_number}`,
              icon: '/TULI TRAVEL LOGO.png',
              tag: 'checkin-3h'
            });
            
            supabase
              .from('travel_records')
              .update({ checkin_3h_alert: true })
              .eq('id', record.id);
              
          }, timeUntil3h);
        }
      }
    });
  };

  const shareCheckinReminder = (record: TravelRecord) => {
    const message = `✈️ Check-in Reminder from Tuli Travel
    
Passenger: ${record.passenger_name}
Flight: ${record.airline_name} ${record.flight_number}
Route: ${record.departure_airport} → ${record.arrival_airport}
Date: ${record.departure_date}
Time: ${record.departure_time}

Check-in opens 24 hours before departure. Don't forget to check in online!

Safe travels! 🛫`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const copyToClipboard = async () => {
    if (!itinerary) return;
    
    const text = `✈️ Travel Itinerary for ${itinerary.passengerName || 'Passenger'}

${itinerary.friendlySummary}
${itinerary.summary}

Flight Details:
${itinerary.flights.map(f => 
`• ${f.airlineName} Flight ${f.flightNumber}
  🛫 ${f.departureCity} at ${f.departureTime} on ${f.departureDate}
  🛬 ${f.arrivalCity} at ${f.arrivalTime}
  🪑 ${f.cabinClassName} ${f.duration ? `• ⏱️ ${f.duration}` : ''}${f.overnight ? ' • 🌙 Overnight Flight' : ''}`
).join('\n\n')}

${itinerary.totalAmount > 0 ? `Total Cost: ${itinerary.currency} ${itinerary.totalAmount.toFixed(2)}` : ''}

${itinerary.pnr ? `PNR: ${itinerary.pnr}` : ''}

Generated by Tuli Travel`;
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateTravelTicket = async () => {
    if (!itinerary) return;
    
    setGeneratingTicket(true);
    try {
      const ticketHTML = generateInvoiceHTML(itinerary);
      
      const options = {
        margin: 10,
        filename: `Tuli-Travel-Invoice-${itinerary.passengerName?.replace(/\s+/g, '-') || 'Travel'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(options).from(ticketHTML).save();
    } catch (error) {
      console.error('Error generating invoice:', error);
      setError('Failed to generate PDF invoice');
    } finally {
      setGeneratingTicket(false);
    }
  };

  const generateInvoiceHTML = (itinerary: TravelItinerary) => {
  const invoiceNumber = `TT-INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Travel Invoice - ${itinerary.passengerName || 'Travel Booking'}</title>
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        @page { 
          size: A4; 
          margin: 20mm; 
        }
        body { 
          font-family: 'Helvetica', 'Arial', sans-serif; 
          background: white; 
          color: #333;
          line-height: 1.4;
        }
        .invoice-container {
          max-width: 100%;
          background: white;
          border: 1px solid #e0e0e0;
        }
        
        /* Header Styles */
        .invoice-header {
          background: #2c3e50;
          padding: 25px 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          color: white;
          border-bottom: 4px solid #3498db;
        }
        .company-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .logo-container {
          width: 100px;
          height: 100px;
          background: white;
          border-radius: 8px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #3498db;
        }
        .logo {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .company-info h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          color: white;
        }
        .company-info .tagline {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 300;
          margin-bottom: 10px;
        }
        .company-details {
          font-size: 13px;
          opacity: 0.8;
          line-height: 1.5;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 15px;
          color: #ecf0f1;
        }
        .invoice-number {
          font-size: 16px;
          background: rgba(255,255,255,0.1);
          padding: 10px 20px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .meta-details {
          font-size: 14px;
          line-height: 1.6;
        }
        
        /* Billing Section */
        .billing-section {
          padding: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          border-bottom: 2px solid #ecf0f1;
          background: #f8f9fa;
        }
        .bill-to, .trip-summary {
          padding: 20px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 3px solid #3498db;
        }
        .passenger-details {
          font-size: 15px;
          line-height: 1.8;
        }
        .passenger-name {
          font-size: 22px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 15px;
        }
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          margin-top: 20px;
        }
        .contact-item {
          text-align: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }
        .contact-item strong {
          display: block;
          margin-bottom: 5px;
          color: #2c3e50;
          font-size: 13px;
        }
        .contact-item span {
          font-size: 13px;
          color: #6c757d;
        }
        
        /* Flight Table */
        .flight-section {
          padding: 0;
        }
        .flight-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
          font-size: 13px;
        }
        .flight-table th {
          background: #34495e;
          color: white;
          padding: 18px 15px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: none;
        }
        .flight-table td {
          padding: 18px 15px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: top;
          background: white;
        }
        .flight-table tr:nth-child(even) td {
          background: #f8f9fa;
        }
        .flight-table tr:hover td {
          background: #e8f4fc;
        }
        
        /* Table Cell Styles */
        .airline-cell {
          font-weight: 600;
          color: #2c3e50;
        }
        .flight-number {
          font-size: 12px;
          color: #6c757d;
          margin-top: 5px;
        }
        .route-cell {
          font-weight: 600;
        }
        .route-details {
          font-size: 12px;
          color: #6c757d;
          margin-top: 5px;
        }
        .date-time {
          font-weight: 600;
          line-height: 1.5;
        }
        .duration {
          font-size: 12px;
          color: #6c757d;
        }
        
        /* Status Badges */
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          background: #28a745;
          color: white;
          border-radius: 15px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .cabin-class {
          background: #007bff;
        }
        .overnight-badge {
          background: #dc3545;
          font-size: 10px;
          padding: 4px 10px;
          margin-top: 5px;
        }
        
        /* Pricing Section */
        .pricing-section {
          padding: 30px;
          background: #f8f9fa;
          border-top: 3px solid #bdc3c7;
        }
        .amount-due {
          max-width: 400px;
          margin-left: auto;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 10px 0;
          font-size: 15px;
        }
        .subtotal, .taxes {
          border-bottom: 1px dashed #adb5bd;
        }
        .total {
          font-size: 20px;
          font-weight: 700;
          color: #2c3e50;
          border-top: 2px solid #3498db;
          padding-top: 15px;
          margin-top: 10px;
        }
        
        /* Terms and Footer */
        .terms-section {
          padding: 25px 30px;
          background: #2c3e50;
          color: white;
          font-size: 12px;
          line-height: 1.6;
        }
        .payment-terms {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.3);
        }
        .contact-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }
        .contact-item {
          text-align: center;
        }
        .contact-item strong {
          display: block;
          margin-bottom: 8px;
          color: #ecf0f1;
          font-size: 13px;
        }
        
        .footer-section {
          padding: 25px 30px;
          background: #ecf0f1;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-top: 2px solid #bdc3c7;
        }
        .footer-section strong {
          color: #2c3e50;
          font-size: 13px;
        }

        /* Logo fallback styling */
        .logo-fallback {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3498db, #2c3e50);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          text-align: center;
        }
        
        /* Utility Classes */
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .mb-3 { margin-bottom: 15px; }
        .mt-4 { margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Invoice Header -->
        <div class="invoice-header">
          <div class="company-section">
            <div class="logo-container">
              <img src="/TULI TRAVEL LOGO.png" alt="Tuli Travel Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="logo-fallback" style="display: none;">TULI TRAVEL</div>
            </div>
            <div class="company-info">
              <h1>TULI TRAVEL</h1>
              <div class="tagline">Executive Adventures and Travel</div>
              <div class="company-details">
                
              </div>
            </div>
          </div>
          <div class="invoice-meta">
            <div class="invoice-title">TRAVEL INVOICE</div>
            <div class="invoice-number">${invoiceNumber}</div>
            <div class="meta-details">
              Issue Date: ${issueDate}<br>
              PNR: ${itinerary.pnr || 'N/A'}<br>
              Status: <span class="status-badge">Paid</span>
            </div>
          </div>
        </div>
        
        <!-- Billing Information -->
        <div class="billing-section">
          <div class="bill-to">
            <div class="section-title">BILL TO</div>
            <div class="passenger-details">
              <div class="passenger-name">${itinerary.passengerName || 'Valued Customer'}</div>
              <div class="contact-grid">
                <div class="contact-item">
                  <strong>Booking Reference</strong>
                  <span>${itinerary.bookingReference || 'N/A'}</span>
                </div>
                <div class="contact-item">
                  <strong>Invoice Date</strong>
                  <span>${issueDate}</span>
                </div>
                <div class="contact-item">
                  <strong>Travel Date</strong>
                  <span>${itinerary.flights[0]?.departureDate || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="trip-summary">
            <div class="section-title">TRIP SUMMARY</div>
            <div style="font-size: 15px; line-height: 1.6;">
              ${itinerary.friendlySummary}<br>
              <span style="color: #6c757d; font-size: 14px; margin-top: 10px; display: block;">
                ${itinerary.summary}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Flight Details Table -->
        <div class="flight-section">
          <table class="flight-table">
            <thead>
              <tr>
                <th style="width: 20%;">Flight Details</th>
                <th style="width: 25%;">Route</th>
                <th style="width: 20%;">Date & Time</th>
                <th style="width: 15%;">Duration</th>
                <th style="width: 20%;" class="text-right">Class & Status</th>
              </tr>
            </thead>
            <tbody>
              ${itinerary.flights.map((flight, index) => `
                <tr>
                  <td class="airline-cell">
                    ${flight.airlineName}
                    <div class="flight-number">Flight ${flight.flightNumber}</div>
                  </td>
                  <td class="route-cell">
                    ${flight.departureAirport} → ${flight.arrivalAirport}
                    <div class="route-details">
                      ${flight.departureCity} to ${flight.arrivalCity}
                    </div>
                  </td>
                  <td class="date-time">
                    ${flight.departureDate}<br>
                    <strong>${flight.departureTime}</strong> - ${flight.arrivalTime}
                    ${flight.overnight ? '<div class="status-badge overnight-badge">Overnight Flight</div>' : ''}
                  </td>
                  <td>
                    ${flight.duration || 'N/A'}
                  </td>
                  <td class="text-right">
                    <div class="status-badge cabin-class">${flight.cabinClassName}</div>
                    <div class="status-badge" style="margin-top: 8px;">Confirmed</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Pricing Breakdown -->
        ${itinerary.totalAmount > 0 ? `
          <div class="pricing-section">
            <div class="amount-due">
              <div class="price-row subtotal">
                <span>Subtotal:</span>
                <span>${itinerary.currency} ${(itinerary.totalAmount * 0.8).toFixed(2)}</span>
              </div>
              <div class="price-row taxes">
                <span>Taxes & Fees:</span>
                <span>${itinerary.currency} ${(itinerary.totalAmount * 0.2).toFixed(2)}</span>
              </div>
              <div class="price-row total">
                <span>TOTAL AMOUNT PAID:</span>
                <span>${itinerary.currency} ${itinerary.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ` : ''}
        
        <!-- Terms and Conditions -->
        <div class="terms-section">
          <div class="payment-terms">
            <strong>PAYMENT TERMS:</strong> This invoice has been paid in full. Amount includes all applicable taxes, fees, and surcharges. Payment received via credit card. For accounting purposes only.
          </div>
          <div class="contact-info">
            <div class="contact-item">
              <strong>Accounting Department</strong>
              accounting@tulitravel.com<br>
              (555) 123-4567 ext. 2
            </div>
            <div class="contact-item">
              <strong>Customer Service</strong>
              support@tulitravel.com<br>
              (555) 123-4567 ext. 1
            </div>
            <div class="contact-item">
              <strong>Emergency Contact</strong>
              emergency@tulitravel.com<br>
              (555) 123-4567 ext. 9
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer-section">
          <div style="margin-bottom: 15px;">
            <strong>TULI TRAVEL - EXECUTIVE ADVENTURES AND TRAVEL</strong><br>
            Professional & Excellent Customer Experience
          </div>
          <div>
            This document is computer-generated and requires no signature. For accounting and record-keeping purposes only.<br>
            Invoice generated on ${new Date().toLocaleString()} via Tuli Travel Smart System
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

  const clearAll = () => {
    setInputText('');
    setItinerary(null);
    setError(null);
    setSavedRecord(null);
  };

  return (
    <div className="space-y-6">
      <ParsingModal />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Travel Itinerary Parser</h2>
          <p className="text-xs text-slate-500">Paste any travel confirmation - SmartOps will make it easy to understand</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
          <Sparkles className="w-3 h-3" />
          Smart-Powered
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-md p-6 border border-slate-200/60">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Paste Your Travel Details</h3>
        </div>
        
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Just paste any travel confirmation text here...\n\nExamples:\n• Airline booking confirmations\n• Flight itineraries  \n• Email confirmations\n• Any travel-related text`}
          className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-sm resize-none"
        />
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleParse}
            disabled={!inputText.trim() || parsing}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed text-sm"
          >
            {parsing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {parsing ? 'Processing...' : 'Parse with SmartOps'}
          </button>
          
          <button
            onClick={clearAll}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-all text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && !parsing && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div ref={resultsSectionRef} className="space-y-4">
        {itinerary && !parsing && (
          <>
            {/* Save for Reminders Card */}
            {!savedRecord && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Enable Check-in Reminders</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      Save this itinerary to get automatic check-in reminders 24 hours and 3 hours before departure. 
                      We'll send browser notifications and desktop alerts.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Browser & Desktop Alerts
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" />
                        WhatsApp Reminders
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        24h & 3h Before Check-in
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={saveToSupabase}
                    disabled={saving}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-semibold transition-all text-sm ml-4"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Enable Reminders'}
                  </button>
                </div>
              </div>
            )}

            {/* Saved Successfully Card */}
            {savedRecord && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Reminders Activated! ✅</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      We'll remind {savedRecord.passenger_name} about check-in 24 hours and 3 hours before departure. 
                      Notifications will appear on your desktop and browser.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => shareCheckinReminder(savedRecord)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-xs"
                      >
                        <Share2 className="w-3 h-3" />
                        Share Reminder
                      </button>
                      <div className="text-xs text-slate-500">
                        PNR: {savedRecord.pnr}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Friendly Summary Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    {itinerary.friendlySummary}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {itinerary.summary}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                    {itinerary.passengerName && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <User className="w-4 h-4" />
                        <span>{itinerary.passengerName}</span>
                      </div>
                    )}
                    {itinerary.totalAmount > 0 && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <CreditCard className="w-4 h-4" />
                        <span>{itinerary.currency} ${itinerary.totalAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <Plane className="w-4 h-4" />
                      <span>{itinerary.flights.length} flight{itinerary.flights.length > 1 ? 's' : ''}</span>
                    </div>
                    {itinerary.pnr && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <Ticket className="w-4 h-4" />
                        <span>PNR: {itinerary.pnr}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-all text-xs border border-slate-200"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  
                  <button
                    onClick={generateTravelTicket}
                    disabled={generatingTicket}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-semibold transition-all text-xs"
                  >
                    {generatingTicket ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Receipt className="w-4 h-4" />
                    )}
                    {generatingTicket ? 'Creating...' : 'PDF Invoice'}
                  </button>
                </div>
              </div>
            </div>

            {/* Flight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itinerary.flights.map((flight, index) => (
                <div key={index} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-md p-5 border border-slate-200/60">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-slate-900">
                          {flight.airlineName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Flight {flight.flightNumber} • {flight.cabinClassName}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      {index === 0 ? 'First Flight' : 
                       index === itinerary.flights.length - 1 ? 'Last Flight' : 
                       `Flight ${index + 1}`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4 p-4 bg-slate-50 rounded-xl">
                    <div className="text-center">
                      <div className="text-lg font-bold text-slate-900">{flight.departureTime}</div>
                      <div className="text-xs text-slate-600">{flight.departureCity}</div>
                      <div className="text-xs text-slate-400 mt-1">Departure</div>
                    </div>
                    
                    <div className="flex-1 mx-4 relative">
                      <div className="h-px bg-slate-300"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                      {flight.duration && (
                        <div className="absolute inset-0 flex items-center justify-center mt-6">
                          <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">
                            {flight.duration}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-slate-900">{flight.arrivalTime}</div>
                      <div className="text-xs text-slate-600">{flight.arrivalCity}</div>
                      <div className="text-xs text-slate-400 mt-1">Arrival</div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-800">Check-in Reminders</span>
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>• 24 hours before: Online check-in opens</div>
                      <div>• 3 hours before: Final reminder</div>
                      <div>• Arrive 2-3 hours before departure</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>{flight.departureDate}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                      <Clock className="w-3 h-3 text-purple-600" />
                      <span>{flight.duration}</span>
                    </div>
                  </div>

                  {flight.overnight && (
                    <div className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs">
                      <Coffee className="w-3 h-3" />
                      Overnight Flight - Remember to rest!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Helper Text */}
      {!itinerary && !error && !parsing && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">How it works</h4>
          <div className="text-xs text-slate-600 space-y-2">
            <p>• <strong>Paste any travel text</strong> - SmartOps translates codes into simple English</p>
            <p>• <strong>Get clear summaries</strong> - understand your travel plans instantly</p>
            <p>• <strong>Professional PDF invoices</strong> - create accounting-ready documents</p>
            <p>• <strong>Automatic reminders</strong> - get check-in alerts 24h & 3h before departure</p>
            <p>• <strong>Share reminders</strong> - send WhatsApp notifications to passengers</p>
          </div>
        </div>
      )}
    </div>
  );
}