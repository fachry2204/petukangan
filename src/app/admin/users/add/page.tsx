'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Save, Trash2, PlusCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AddPetugasPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Laki-laki',
    birthDate: '',
    phone: '',
    address: '',
    joinDate: '',
    status: 'ACTIVE',
    photoUrl: '',
    country: 'Indonesia',
    province: '',
    city: '',
    district: '',
    village: '',
    postalCode: '',
    documents: [] as { base64: string; description: string; fileName: string; progress: number; isUploaded: boolean }[]
  });

  // State to hold Indonesian region options from emsifa API
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  // State to hold the active selected IDs for emsifa API queries
  const [selectedProvId, setSelectedProvId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');

  // 1. Fetch Provinces initially
  useEffect(() => {
    axios.get('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(res => setProvinces(res.data))
      .catch(err => console.error('Failed to load provinces', err));
  }, []);

  // 2. Fetch Cities/Regencies based on selected province
  useEffect(() => {
    if (selectedProvId) {
      axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvId}.json`)
        .then(res => setCities(res.data))
        .catch(err => console.error('Failed to load cities', err));
    } else {
      setCities([]);
    }
  }, [selectedProvId]);

  // 3. Fetch Districts based on selected city
  useEffect(() => {
    if (selectedCityId) {
      axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedCityId}.json`)
        .then(res => setDistricts(res.data))
        .catch(err => console.error('Failed to load districts', err));
    } else {
      setDistricts([]);
    }
  }, [selectedCityId]);

  // 4. Fetch Villages based on selected district
  useEffect(() => {
    if (selectedDistrictId) {
      axios.get(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedDistrictId}.json`)
        .then(res => setVillages(res.data))
        .catch(err => console.error('Failed to load villages', err));
    } else {
      setVillages([]);
    }
  }, [selectedDistrictId]);

  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provId = e.target.value;
    const provObj = provinces.find(p => p.id === provId);
    setSelectedProvId(provId);
    setSelectedCityId('');
    setSelectedDistrictId('');
    setFormData({
      ...formData,
      province: provObj ? provObj.name : '',
      city: '',
      district: '',
      village: '',
      postalCode: ''
    });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = e.target.value;
    const cityObj = cities.find(c => c.id === cityId);
    setSelectedCityId(cityId);
    setSelectedDistrictId('');
    setFormData({
      ...formData,
      city: cityObj ? cityObj.name : '',
      district: '',
      village: '',
      postalCode: ''
    });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const distId = e.target.value;
    const distObj = districts.find(d => d.id === distId);
    setSelectedDistrictId(distId);
    setFormData({
      ...formData,
      district: distObj ? distObj.name : '',
      village: '',
      postalCode: ''
    });
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const villageName = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      village: villageName,
      postalCode: '' // clear initially and try to auto fetch
    }));

    if (villageName) {
      // Auto fetch postal code using open postal code search API
      axios.get(`https://kodepos.vercel.app/search?q=${encodeURIComponent(villageName)}`)
        .then(res => {
          if (res.data && res.data.data && res.data.data.length > 0) {
            // Match the city/district to ensure correct region postal code
            const match = res.data.data.find((r: any) => 
              r.village.toLowerCase() === villageName.toLowerCase() &&
              r.district.toLowerCase() === formData.district.toLowerCase()
            ) || res.data.data[0];
            
            if (match) {
              setFormData(prev => ({ ...prev, postalCode: String(match.code) }));
            }
          }
        })
        .catch(err => console.error('Failed to auto-fetch postal code', err));
    }
  };

  const handlePhotoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, photoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const simulateUpload = (index: number) => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setFormData(prev => {
        const newDocs = [...prev.documents];
        if (newDocs[index]) {
          newDocs[index].progress = Math.min(currentProgress, 100);
          if (currentProgress >= 100) {
            newDocs[index].isUploaded = true;
            clearInterval(interval);
          }
        } else {
          clearInterval(interval);
        }
        return { ...prev, documents: newDocs };
      });
    }, 150);
  };

  const addDocumentField = () => {
    setFormData({
      ...formData,
      documents: [...formData.documents, { base64: '', description: '', fileName: '', progress: 0, isUploaded: false }]
    });
  };

  const removeDocumentField = (index: number) => {
    const newDocs = [...formData.documents];
    newDocs.splice(index, 1);
    setFormData({ ...formData, documents: newDocs });
  };

  const updateDocumentFile = (index: number, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => {
        const newDocs = [...prev.documents];
        newDocs[index].base64 = reader.result as string;
        newDocs[index].fileName = file.name;
        newDocs[index].progress = 0;
        newDocs[index].isUploaded = false;
        return { ...prev, documents: newDocs };
      });
      simulateUpload(index);
    };
    reader.readAsDataURL(file);
  };

  const updateDocumentDescription = (index: number, desc: string) => {
    const newDocs = [...formData.documents];
    newDocs[index].description = desc;
    setFormData({ ...formData, documents: newDocs });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let formattedPhone = formData.phone;
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      }

      // Convert DD/MM/YYYY to YYYY-MM-DD for backend
      const parseDate = (d: string) => {
        if (!d) return null;
        const parts = d.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return d;
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        ...formData,
        birthDate: parseDate(formData.birthDate),
        joinDate: parseDate(formData.joinDate),
        phone: formattedPhone,
        roleName: 'PPSU',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({ title: 'Berhasil', description: 'Data Petugas berhasil ditambahkan' });
      router.push('/admin/users');
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal menambahkan data', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tambah Petugas</h1>
          <p className="text-zinc-500">Registrasi akun baru untuk petugas PPSU.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle>Form Data Petugas</CardTitle>
          <CardDescription>Semua kolom yang memiliki tanda bintang wajib diisi.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-base">User ID / Username</Label>
                <Input disabled value="Dihasilkan Otomatis (PPSU...)" className="bg-zinc-100 rounded-xl h-14 text-base" />
                <p className="text-sm text-zinc-500">Password default: 1234</p>
              </div>
              <div className="space-y-3">
                <Label className="text-base">Nama Petugas *</Label>
                <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Nama Lengkap" className="rounded-xl h-14 text-base" />
              </div>
              <div className="space-y-3">
                <Label className="text-base">Jenis Kelamin</Label>
                <select 
                  className="flex h-14 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-base">Tanggal Lahir *</Label>
                <Input type="text" placeholder="DD/MM/YYYY" required value={formData.birthDate} onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  let formatted = val;
                  if (val.length > 2) formatted = val.slice(0, 2) + '/' + val.slice(2);
                  if (val.length > 4) formatted = formatted.slice(0, 5) + '/' + val.slice(4, 8);
                  setFormData({...formData, birthDate: formatted});
                }} className="rounded-xl h-14 text-base px-4" maxLength={10} />
              </div>
              <div className="space-y-3">
                <Label className="text-base">No Handphone *</Label>
                <Input required type="tel" placeholder="0812..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl h-14 text-base" />
              </div>
              <div className="space-y-3">
                <Label className="text-base">Tanggal Bergabung *</Label>
                <Input type="text" placeholder="DD/MM/YYYY" required value={formData.joinDate} onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  let formatted = val;
                  if (val.length > 2) formatted = val.slice(0, 2) + '/' + val.slice(2);
                  if (val.length > 4) formatted = formatted.slice(0, 5) + '/' + val.slice(4, 8);
                  setFormData({...formData, joinDate: formatted});
                }} className="rounded-xl h-14 text-base px-4" maxLength={10} />
              </div>

              {/* DYNAMIC REGION SELECTION BASED ON EM-SIFA REGION API */}
              <div className="space-y-3 col-span-2 pt-4 border-t">
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Data Wilayah Domisili</h3>
                <p className="text-xs text-zinc-500">Pilih regional daerah asal petugas menggunakan pencarian regional langsung.</p>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Negara *</Label>
                <select 
                  className="flex h-14 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-not-allowed"
                  value={formData.country}
                  disabled
                >
                  <option value="Indonesia">Indonesia</option>
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Provinsi *</Label>
                <select 
                  required
                  className="flex h-14 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={selectedProvId}
                  onChange={handleProvChange}
                >
                  <option value="">-- Pilih Provinsi --</option>
                  {provinces.map((prov: any) => (
                    <option key={prov.id} value={prov.id}>{prov.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Kota / Kabupaten *</Label>
                <select 
                  required
                  disabled={!selectedProvId}
                  className="flex h-14 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-zinc-100 disabled:cursor-not-allowed"
                  value={selectedCityId}
                  onChange={handleCityChange}
                >
                  <option value="">-- Pilih Kota / Kabupaten --</option>
                  {cities.map((city: any) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Kecamatan *</Label>
                <select 
                  required
                  disabled={!selectedCityId}
                  className="flex h-14 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-zinc-100 disabled:cursor-not-allowed"
                  value={selectedDistrictId}
                  onChange={handleDistrictChange}
                >
                  <option value="">-- Pilih Kecamatan --</option>
                  {districts.map((dist: any) => (
                    <option key={dist.id} value={dist.id}>{dist.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Kelurahan / Desa *</Label>
                <select 
                  required
                  disabled={!selectedDistrictId}
                  className="flex h-14 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-zinc-100 disabled:cursor-not-allowed"
                  value={formData.village}
                  onChange={handleVillageChange}
                >
                  <option value="">-- Pilih Kelurahan / Desa --</option>
                  {villages.map((vil: any) => (
                    <option key={vil.id} value={vil.name}>{vil.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Kode Pos *</Label>
                <Input 
                  required
                  type="text"
                  placeholder="Contoh: 12260"
                  value={formData.postalCode} 
                  onChange={e => setFormData({...formData, postalCode: e.target.value.replace(/[^0-9]/g, '')})} 
                  className="rounded-xl h-14 text-base px-4" 
                  maxLength={5}
                />
              </div>

              <div className="space-y-3 col-span-2">
                <Label className="text-base">Alamat Lengkap *</Label>
                <Textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="rounded-xl min-h-[140px] text-base p-4" />
              </div>

              <div className="space-y-3 col-span-2 mt-4 pt-8 border-t">
                <Label className="text-base">Foto Petugas (Opsional)</Label>
                <Input type="file" accept="image/*" onChange={handlePhotoUpload} className="rounded-xl h-14 text-base py-3 px-4" />
                {formData.photoUrl && <img src={formData.photoUrl} alt="Preview" className="w-32 h-32 object-cover rounded-xl mt-4" />}
              </div>

              <div className="space-y-4 col-span-2 mt-4 pt-8 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold text-zinc-900">Dokumen Pendukung</Label>
                  <Button type="button" variant="outline" onClick={addDocumentField} className="rounded-xl h-10 border-orange-200 text-orange-600 hover:bg-orange-50">
                    <PlusCircle className="w-4 h-4 mr-2" /> Tambah Dokumen
                  </Button>
                </div>
                
                {formData.documents.map((doc, index) => (
                  <div key={index} className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-4">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-6 items-end">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-zinc-700">Pilih File</Label>
                        <Input 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              updateDocumentFile(index, e.target.files[0]);
                            }
                          }} 
                          className="rounded-xl bg-white h-14 py-3 px-4 text-base" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-zinc-700">Keterangan File</Label>
                        <Input 
                          type="text" 
                          placeholder="Contoh: KTP, Ijazah, dll..." 
                          value={doc.description} 
                          onChange={(e) => updateDocumentDescription(index, e.target.value)} 
                          className="rounded-xl bg-white h-14 text-base px-4" 
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => removeDocumentField(index)} 
                        className="h-14 w-14 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-6 h-6" />
                      </Button>
                    </div>

                    {/* Progress Bar & Success indicator */}
                    {(doc.progress > 0 || doc.isUploaded) && (
                      <div className="grid grid-cols-2 gap-6 pt-2 border-t border-zinc-200/50">
                        {doc.progress > 0 && !doc.isUploaded && (
                          <div className="space-y-1.5">
                            <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-orange-500 h-full transition-all duration-300" 
                                style={{ width: `${doc.progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500 font-medium">
                              <span>Mengunggah...</span>
                              <span>{doc.progress}%</span>
                            </div>
                          </div>
                        )}
                        {doc.isUploaded && (
                          <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span>Dokumen Berhasil Diunggah!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {formData.documents.length === 0 && (
                  <div className="p-8 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                    <p className="text-sm text-zinc-500">Belum ada dokumen pendukung. Klik "Tambah Dokumen" untuk melampirkan berkas.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-8 mt-4 border-t flex justify-end gap-4">
              <Link href="/admin/users">
                <Button variant="outline" type="button" className="rounded-xl h-12 px-8">
                  Batal
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Simpan Petugas
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
