import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookMarked, FileText, Link as LinkIcon, Video, Image, Search, ExternalLink, Download } from 'lucide-react';
import api from '@/services/api';

const TYPE_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  video:    Video,
  image:    Image,
  link:     LinkIcon,
  other:    BookMarked,
};

const TYPE_COLORS: Record<string, string> = {
  document: 'bg-blue-100 text-blue-700',
  video:    'bg-purple-100 text-purple-700',
  image:    'bg-pink-100 text-pink-700',
  link:     'bg-green-100 text-green-700',
  other:    'bg-gray-100 text-gray-700',
};

export function LearningMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      // Students only see public materials
      const res: any = await api.getLearningMaterials({ is_public: true });
      const data = res?.data || res?.materials || res || [];
      setMaterials(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const types = ['document', 'video', 'image', 'link', 'other'];

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase()) ||
      m.subject_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || m.material_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Learning Materials</h2>
        <p className="text-sm text-gray-500">Resources shared by your teachers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search materials..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${!typeFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            All
          </button>
          {types.map(t => {
            const Icon = TYPE_ICONS[t] || BookMarked;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${typeFilter === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookMarked className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No materials found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || typeFilter ? 'Try adjusting your search or filter.' : 'Your teachers haven\'t shared any materials yet.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m: any) => {
          const type = m.material_type || 'other';
          const Icon = TYPE_ICONS[type] || BookMarked;
          const colorClass = TYPE_COLORS[type] || TYPE_COLORS.other;
          const isUrl = m.file_url && (m.file_url.startsWith('http://') || m.file_url.startsWith('https://'));

          return (
            <Card key={m.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold line-clamp-2">{m.title}</CardTitle>
                    {m.subject_name && (
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">{m.subject_name}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-3">
                {m.description && (
                  <p className="text-sm text-gray-500 line-clamp-3">{m.description}</p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className={`capitalize text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                    {type}
                  </span>
                  {m.file_url && (
                    <a
                      href={m.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
                    >
                      {isUrl ? (
                        <><ExternalLink className="h-3.5 w-3.5" /> Open</>
                      ) : (
                        <><Download className="h-3.5 w-3.5" /> Download</>
                      )}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
