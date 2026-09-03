import { useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { FEATURE_PAGES } from '@/data/featurePages';

export function FeatureLandingPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const content = FEATURE_PAGES[slug];

  useSEO({
    title: content?.metaTitle || 'SkulManager',
    description: content?.metaDescription || '',
    path: `/features/${slug}`,
  });

  useEffect(() => {
    if (!content) return;

    const scripts: HTMLScriptElement[] = [];

    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
    document.head.appendChild(faqScript);
    scripts.push(faqScript);

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://skulmanager.org/' },
        { '@type': 'ListItem', position: 2, name: content.eyebrow, item: `https://skulmanager.org/features/${slug}` },
      ],
    });
    document.head.appendChild(breadcrumbScript);
    scripts.push(breadcrumbScript);

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'keywords');
    meta.setAttribute('content', content.keywords);
    document.head.appendChild(meta);

    return () => {
      scripts.forEach(s => document.head.removeChild(s));
      document.head.removeChild(meta);
    };
  }, [content, slug]);

  if (!content) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`bg-gradient-to-r ${content.gradient} text-white py-14 px-4`}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <p className="uppercase tracking-wider text-white/70 text-xs font-semibold mb-3">{content.eyebrow}</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 max-w-3xl">{content.heading}</h1>
          <p className="text-white/90 max-w-2xl text-lg">{content.tagline}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button onClick={() => navigate('/register')} className="bg-white text-gray-900 hover:bg-gray-100">
              Register Your School
            </Button>
            <Button onClick={() => navigate('/contact')} variant="outline" className="border-white/40 text-white hover:bg-white/10">
              Contact Us for Pricing
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-sm max-w-none mb-12">
          {content.intro.map((para, i) => (
            <p key={i} className="text-gray-700 leading-relaxed mb-4">{para}</p>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-5">What's included</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {content.benefits.map((b) => (
            <div key={b.title} className={`rounded-xl border p-5 ${content.accent}`}>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{b.title}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-4 mb-12">
          {content.faqs.map((f) => (
            <div key={f.q} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-sm text-gray-800 mb-2">{f.q}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 text-center text-white">
          <p className="font-semibold text-lg mb-1">Ready to see it running in your school?</p>
          <p className="text-gray-300 text-sm mb-5">KSh 50,000 deposit to register, or try the live demo first — no signup needed.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/register')} className="bg-white text-gray-900 hover:bg-gray-100">
              Register Your School
            </Button>
            <a href="tel:0110421320">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/10"><Phone className="mr-2 h-4 w-4" /> Call 0110 421 320</Button>
            </a>
            <a href="mailto:info@helvino.org">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/10"><Mail className="mr-2 h-4 w-4" /> info@helvino.org</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
