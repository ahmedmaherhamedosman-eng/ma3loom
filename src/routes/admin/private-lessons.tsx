import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { 
  Package, CalendarCheck, Users, DollarSign, Plus, Edit, Trash2, Loader2, X 
} from 'lucide-react'

export const Route = createFileRoute('/admin/private-lessons')({
  component: AdminPrivateLessonsDashboard,
})

type PrivateLessonPackage = Database['public']['Tables']['private_lesson_packages']['Row']
type PrivateLessonPackagePayload = Database['public']['Tables']['private_lesson_packages']['Insert']
type PrivateLessonBooking = Database['public']['Tables']['private_lesson_bookings']['Row']

function AdminPrivateLessonsDashboard() {
  const [activeTab, setActiveTab] = useState<'packages' | 'bookings'>('packages')
  const [packages, setPackages] = useState<PrivateLessonPackage[]>([])
  const [bookings, setBookings] = useState<PrivateLessonBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // حالة النافذة (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null)

  // نموذج إدخال الباقة
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    badge: '',
    short_description: '',
    price: '',
    duration_minutes: '60',
    sessions_count: '1',
    featuresText: '',
    is_featured: false,
    is_active: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: pkgs } = await supabase
        .from('private_lesson_packages')
        .select('*')
        .order('created_at', { ascending: false })
      
      const { data: bks } = await supabase
        .from('private_lesson_bookings')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (pkgs) setPackages(pkgs)
      if (bks) setBookings(bks)
    } catch (err) {
      console.error('Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  // فتح نافذة الإضافة
  const handleOpenAddModal = () => {
    setEditingPackageId(null)
    setFormData({
      slug: '',
      name: '',
      badge: '',
      short_description: '',
      price: '',
      duration_minutes: '60',
      sessions_count: '1',
      featuresText: '',
      is_featured: false,
      is_active: true
    })
    setIsModalOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEditModal = (pkg: PrivateLessonPackage) => {
    setEditingPackageId(pkg.id)
    setFormData({
      slug: pkg.slug || '',
      name: pkg.name,
      badge: pkg.badge || '',
      short_description: pkg.short_description || '',
      price: pkg.price ? String(pkg.price) : '',
      duration_minutes: String(pkg.duration_minutes || 60),
      sessions_count: String(pkg.sessions_count || 1),
      featuresText: Array.isArray(pkg.feature_list) ? pkg.feature_list.join('\n') : '',
      is_featured: pkg.is_featured || false,
      is_active: pkg.is_active ?? true
    })
    setIsModalOpen(true)
  }

  // حفظ الباقة
  const handleSubmitPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const featuresArray = formData.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0)

    const payload: PrivateLessonPackagePayload = {
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
      name: formData.name,
      badge: formData.badge || null,
      short_description: formData.short_description || null,
      price: parseFloat(formData.price) || 0,
      duration_minutes: parseInt(formData.duration_minutes, 10) || 60,
      sessions_count: parseInt(formData.sessions_count, 10) || 1,
      feature_list: featuresArray,
      is_featured: formData.is_featured,
      is_active: formData.is_active
    }

    try {
      if (editingPackageId) {
        const { error } = await supabase
          .from('private_lesson_packages')
          .update(payload)
          .eq('id', editingPackageId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('private_lesson_packages')
          .insert(payload)

        if (error) throw error
      }

      setIsModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      alert('حدث خطأ أثناء حفظ الباقة: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'))
    } finally {
      setSaving(false)
    }
  }

  // حذف باقة
  const handleDeletePackage = async (id: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذه الباقة؟')) return

    try {
      const { error } = await supabase
        .from('private_lesson_packages')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (err: unknown) {
      alert('حدث خطأ أثناء الحذف: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'))
    }
  }

  return (
    <div dir="rtl" className="p-6 space-y-8 bg-slate-50/50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 font-sans">
      
      {/* الهيدر والعنوان */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            🎯 إدارة الحصص الخصوصية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            التحكم الكامل بباقات الحصص الخصوصية ومتابعة الحجوزات والعمليات المالية.
          </p>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة باقة جديدة</span>
        </button>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">إجمالي الباقات</p>
            <p className="text-xl font-black mt-0.5">{packages.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-2xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">إجمالي الحجوزات</p>
            <p className="text-xl font-black mt-0.5">{bookings.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">إجمالي الإيرادات</p>
            <p className="text-xl font-black mt-0.5">
              {bookings.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0)} ر.س
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">الحجوزات النشطة</p>
            <p className="text-xl font-black mt-0.5">
              {bookings.filter((booking) => booking.booking_status === 'confirmed').length}
            </p>
          </div>
        </div>
      </div>

      {/* التبويبات Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('packages')}
          className={`pb-3 transition-colors relative cursor-pointer ${
            activeTab === 'packages' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          إدارة الباقات
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 transition-colors relative cursor-pointer ${
            activeTab === 'bookings' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          سجل الحجوزات
        </button>
      </div>

      {/* محتوى الجداول */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : activeTab === 'packages' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">اسم الباقة</th>
                  <th className="p-4">الشعار (Badge)</th>
                  <th className="p-4">السعر</th>
                  <th className="p-4">المدة</th>
                  <th className="p-4 text-center">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">لا توجد باقات مضافة حالياً.</td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{pkg.name}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {pkg.badge || 'عادي'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{pkg.price} ر.س</td>
                      <td className="p-4 text-slate-500">{pkg.sessions_count} حصة · {pkg.duration_minutes} دقيقة</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${pkg.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {pkg.is_active ? 'مُفعلة' : 'معطلة'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleOpenEditModal(pkg)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">المادة</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">الوقت</th>
                  <th className="p-4">المبلغ</th>
                  <th className="p-4 text-center">حالة الحجز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">لا توجد حجوزات مسجلة حتى الآن.</td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-4 font-bold">{b.subject}</td>
                      <td className="p-4 text-slate-500">{b.lesson_date}</td>
                      <td className="p-4 text-slate-500">{b.lesson_time}</td>
                      <td className="p-4 font-bold text-emerald-600">{b.total_amount} ر.س</td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {b.booking_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نافذة الإضافة / التعديل (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b pb-4 dark:border-slate-800">
              <h2 className="text-xl font-bold">
                {editingPackageId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPackage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">اسم الباقة</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="مثال: الباقة الشهرية"
                    className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">المعرف (Slug)</label>
                  <input 
                    type="text" 
                    value={formData.slug} 
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    placeholder="monthly-package"
                    className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">السعر</label>
                  <input 
                    type="number" 
                    required
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    placeholder="650"
                    className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">مدة الحصة (دقيقة)</label>
                  <input 
                    type="number" min="1"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({...formData, duration_minutes: e.target.value})}
                    placeholder="60"
                    className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">الشعار (Badge)</label>
                  <input 
                    type="text" 
                    value={formData.badge} 
                    onChange={e => setFormData({...formData, badge: e.target.value})}
                    placeholder="🔥 الأكثر طلباً"
                    className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">عدد الحصص</label>
                  <input 
                    type="number" min="1"
                    value={formData.sessions_count}
                    onChange={e => setFormData({...formData, sessions_count: e.target.value})}
                    placeholder="1"
                    className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">الوصف</label>
                <textarea 
                  rows={2}
                  value={formData.short_description}
                  onChange={e => setFormData({...formData, short_description: e.target.value})}
                  placeholder="وصف مختصر للباقة..."
                  className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">المميزات (اكتب كل ميزة في سطر جديد)</label>
                <textarea 
                  rows={4}
                  value={formData.featuresText} 
                  onChange={e => setFormData({...formData, featuresText: e.target.value})}
                  placeholder="16 حصة شهرية&#10;خطة تعليمية شخصية&#10;شهادة إتمام"
                  className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_featured}
                    onChange={e => setFormData({...formData, is_featured: e.target.checked})}
                    className="rounded text-blue-600"
                  />
                  <span>تمييز كـ "الأكثر شعبية"</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded text-blue-600"
                  />
                  <span>الباقة مفعلة</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPackageId ? 'حفظ التعديلات' : 'إضافة الباقة'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
