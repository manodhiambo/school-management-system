import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Clock, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function ContactSupportPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', school: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Opens email client with pre-filled details
    const body = encodeURIComponent(
      `Name: ${form.name}\nSchool: ${form.school}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.open(`mailto:info@helvino.org?subject=${encodeURIComponent(form.subject || 'Skul Manager Support')}&body=${body}`);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-700 to-cyan-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold">Contact Support</h1>
          </div>
          <p className="text-blue-100 max-w-xl">Get help from the Skul Manager support team. We are based in Kenya and available during business hours.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10">
        {/* Contact details */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Get in Touch</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white rounded-xl border border-gray-100 p-4">
              <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Phone / WhatsApp</p>
                <a href="tel:0110421320" className="text-blue-600 font-bold text-lg hover:underline">0110 421 320</a>
                <p className="text-xs text-gray-400 mt-0.5">Call or WhatsApp anytime during business hours</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-xl border border-gray-100 p-4">
              <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Email</p>
                <a href="mailto:info@helvino.org" className="text-blue-600 hover:underline">info@helvino.org</a>
                <p className="text-xs text-gray-400 mt-0.5">We respond within 24 hours on business days</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-xl border border-gray-100 p-4">
              <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Office Location</p>
                <p className="text-gray-700">Helvino Technologies Limited</p>
                <p className="text-gray-500 text-sm">Siaya, Kenya</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-xl border border-gray-100 p-4">
              <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Business Hours</p>
                <p className="text-gray-700 text-sm">Monday – Friday: 8:00 AM – 6:00 PM</p>
                <p className="text-gray-700 text-sm">Saturday: 9:00 AM – 2:00 PM</p>
                <p className="text-gray-400 text-xs mt-1">East Africa Time (EAT / UTC+3)</p>
              </div>
            </div>
          </div>

          {/* M-Pesa */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Pay via M-Pesa</p>
            <div className="flex gap-6 text-sm">
              <div><p className="text-green-600 text-xs">Paybill</p><p className="text-2xl font-extrabold text-gray-900">522533</p></div>
              <div className="w-px bg-green-200" />
              <div><p className="text-green-600 text-xs">Account</p><p className="text-2xl font-extrabold text-gray-900">8071524</p></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Call us after payment to activate your school</p>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {sent ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-gray-500 text-sm mb-6">Your email client should open with your message. If not, email us directly at info@helvino.org</p>
              <Button onClick={() => setSent(false)} variant="outline">Send Another</Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-5">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Your Name *</label>
                    <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">School Name</label>
                  <input value={form.school} onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    placeholder="e.g. Technical support, Billing, Feature request"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Message *</label>
                  <textarea required rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Describe your issue or question in detail…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  <Send className="mr-2 h-4 w-4" /> Send Message
                </Button>
                <p className="text-xs text-gray-400 text-center">This opens your email client. Or call us directly on 0110 421 320.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
