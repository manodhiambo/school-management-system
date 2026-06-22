import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';

const VIDEOS = [
  {
    category: 'Getting Started',
    items: [
      { title: 'School Registration & First Login', duration: '3 min', desc: 'How to register your school, set up your admin account, and log in for the first time.', available: false },
      { title: 'Dashboard Overview', duration: '4 min', desc: 'A tour of the admin dashboard — what each section does and where to find key features.', available: false },
      { title: 'Adding Classes & Subjects', duration: '5 min', desc: 'Set up your school\'s class structure and link subjects to classes for CBE tracking.', available: false },
    ],
  },
  {
    category: 'Student Management',
    items: [
      { title: 'Admitting a New Student (Full Wizard)', duration: '7 min', desc: 'Walk through the complete 4-step student admission wizard — all Kenya CBE fields covered.', available: false },
      { title: 'Linking Students to Parents', duration: '4 min', desc: 'How to link students to parent accounts and set up parent portal access.', available: false },
    ],
  },
  {
    category: 'Finance',
    items: [
      { title: 'Recording Fee Payments (M-Pesa & Cash)', duration: '5 min', desc: 'How to record payments, generate receipts, and track balances per student.', available: false },
      { title: 'Generating Fee Invoices', duration: '4 min', desc: 'Bulk invoice generation for a class and individual student invoice management.', available: false },
    ],
  },
  {
    category: 'Transport',
    items: [
      { title: 'Driver App — Marking Pickups', duration: '5 min', desc: 'How the driver marks students as picked, dropped, or not found with GPS.', available: false },
      { title: 'Parent Transport Tracking', duration: '3 min', desc: 'How parents track their child\'s transport status and use the "Left Home" feature.', available: false },
    ],
  },
  {
    category: 'CBE Academics',
    items: [
      { title: 'Entering SBA Marks', duration: '6 min', desc: 'How teachers enter School-Based Assessment marks and how CBE grades are computed.', available: false },
      { title: 'Generating CBE Report Cards', duration: '5 min', desc: 'Compiling term results and exporting CBE-compliant report cards as PDF.', available: false },
    ],
  },
];

export function VideoTutorialsPage() {
  useSEO({
    title: 'Video Tutorials | SkulManager',
    description: 'Step-by-step video tutorials for SkulManager — school registration, dashboard tour, CBE academics, fees, M-Pesa payments, and more.',
    path: '/tutorials',
  });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-200 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Play className="h-5 w-5 fill-white" />
            </div>
            <h1 className="text-3xl font-bold">Video Tutorials</h1>
          </div>
          <p className="text-purple-100 max-w-xl">
            Watch step-by-step video guides for every feature in Skul Manager.
            Our tutorials are designed for Kenyan school administrators, teachers, and parents.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Coming soon banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-10 flex items-start gap-4">
          <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center shrink-0">
            <Play className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-yellow-800 mb-1">Video Tutorials Coming Soon</h2>
            <p className="text-yellow-700 text-sm mb-3">
              We are recording professional video tutorials for all Skul Manager features.
              In the meantime, our support team is available for live demonstrations via phone or video call.
            </p>
            <a href="tel:0110421320">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-white text-sm">
                <Phone className="mr-2 h-4 w-4" /> Request Live Demo — Call 0110 421 320
              </Button>
            </a>
          </div>
        </div>

        {/* Upcoming videos list */}
        {VIDEOS.map(section => (
          <div key={section.category} className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{section.category}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {section.items.map(video => (
                <div key={video.title} className="bg-white rounded-xl border border-gray-100 overflow-hidden opacity-75">
                  {/* Thumbnail placeholder */}
                  <div className="bg-gradient-to-br from-gray-800 to-gray-700 h-36 flex items-center justify-center relative">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                    </div>
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {video.duration}
                    </span>
                    <span className="absolute bottom-2 left-2 bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-sm text-gray-800">{video.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{video.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Contact */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center mt-6">
          <p className="font-semibold text-blue-800 mb-1">Need help now?</p>
          <p className="text-blue-700 text-sm mb-4">Our support team offers live screen-sharing sessions to walk you through any feature.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:0110421320">
              <Button className="bg-blue-600 hover:bg-blue-700"><Phone className="mr-2 h-4 w-4" /> Call 0110 421 320</Button>
            </a>
            <a href="mailto:info@helvino.org">
              <Button variant="outline" className="border-blue-300 text-blue-700">Email info@helvino.org</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
