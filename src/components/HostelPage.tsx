import React, { useState } from 'react';
import {
  Palmtree,
  Building2,
  TreePine,
  Image,
  Wifi,
  ChefHat,
  Lock,
  WashingMachine,
  Wine,
  Snowflake,
  Coffee,
  Car,
  Waves,
  Bike,
  Mail,
  Phone,
  MapPin,
  Globe,
  Copy,
  Share2,
  Check,
  ExternalLink,
  QrCode,
  Eye,
  Palette,
  Pencil,
  ArrowLeft,
  CalendarDays,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import type { HostelPageTemplate } from '../types';
import { BookingEngine } from './BookingEngine';

const TEMPLATES: { id: HostelPageTemplate; labelKey: string; gradient: string; icon: React.ElementType }[] = [
  { id: 'beach', labelKey: 'hostelPage.templateBeach', gradient: 'from-orange-400 to-yellow-300', icon: Palmtree },
  { id: 'city', labelKey: 'hostelPage.templateCity', gradient: 'from-blue-500 to-indigo-400', icon: Building2 },
  { id: 'nature', labelKey: 'hostelPage.templateNature', gradient: 'from-emerald-500 to-green-400', icon: TreePine },
];

const FACILITIES = [
  { key: 'WiFi', icon: Wifi },
  { key: 'Kitchen', icon: ChefHat },
  { key: 'Locker', icon: Lock },
  { key: 'Laundry', icon: WashingMachine },
  { key: 'Bar', icon: Wine },
  { key: 'AC', icon: Snowflake },
  { key: 'Breakfast', icon: Coffee },
  { key: 'Parking', icon: Car },
  { key: 'Surfboard Rental', icon: Waves },
  { key: 'Bike Rental', icon: Bike },
];

export function HostelPage() {
  const { hostelPage, updateHostelPage } = useHostel();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  const shareLink = `bunkdesk.app/p/${hostelPage.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${shareLink}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFacility = (facility: string) => {
    const facilities = hostelPage.facilities.includes(facility)
      ? hostelPage.facilities.filter((f) => f !== facility)
      : [...hostelPage.facilities, facility];
    updateHostelPage({ facilities });
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
          <Globe className="h-6 w-6 text-emerald-500" />
          {t('hostelPage.title')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {t('hostelPage.subtitle')}
        </p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* ── Template Selector ──────────────────────────────── */}
        <motion.div variants={item}>
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-zinc-400" />
            {t('hostelPage.templateSelector')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((tpl) => {
              const selected = hostelPage.template === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => updateHostelPage({ template: tpl.id })}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className={`bg-gradient-to-br ${tpl.gradient} h-24 flex items-center justify-center`}>
                    <tpl.icon className="h-10 w-10 text-white/80" />
                  </div>
                  <div className="p-2.5 bg-white">
                    <span className="text-xs font-semibold text-zinc-800">
                      {t(tpl.labelKey)}
                    </span>
                  </div>
                  {selected && (
                    <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Page Editor + Preview ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <motion.div variants={item} className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-zinc-400" />
              {t('hostelPage.editor')}
            </h2>

            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-4">
              {/* Hostel Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t('hostelPage.hostelName')}
                </label>
                <input
                  type="text"
                  value={hostelPage.hostelName}
                  onChange={(e) => updateHostelPage({ hostelName: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t('hostelPage.description')}
                </label>
                <textarea
                  value={hostelPage.description}
                  onChange={(e) => updateHostelPage({ description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition resize-none"
                />
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t('hostelPage.coverImage')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={hostelPage.coverImage}
                    onChange={(e) => updateHostelPage({ coverImage: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                  {hostelPage.coverImage && (
                    <img
                      src={hostelPage.coverImage}
                      alt="Cover preview"
                      className="h-9 w-14 rounded-lg object-cover border border-zinc-200"
                    />
                  )}
                </div>
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">
                  {t('hostelPage.facilities')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FACILITIES.map(({ key, icon: Icon }) => {
                    const active = hostelPage.facilities.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleFacility(key)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                    {t('hostelPage.contactEmail')}
                  </label>
                  <input
                    type="email"
                    value={hostelPage.contactEmail}
                    onChange={(e) => updateHostelPage({ contactEmail: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                    {t('hostelPage.contactPhone')}
                  </label>
                  <input
                    type="tel"
                    value={hostelPage.contactPhone}
                    onChange={(e) => updateHostelPage({ contactPhone: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t('hostelPage.address')}
                </label>
                <input
                  type="text"
                  value={hostelPage.address}
                  onChange={(e) => updateHostelPage({ address: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                />
              </div>

              {/* Published Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <div>
                  <span className="text-sm font-medium text-zinc-800">
                    {t('hostelPage.published')}
                  </span>
                  <p className="text-xs text-zinc-500">
                    {hostelPage.published
                      ? t('hostelPage.publishedDesc')
                      : t('hostelPage.unpublishedDesc')}
                  </p>
                </div>
                <button
                  onClick={() => updateHostelPage({ published: !hostelPage.published })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    hostelPage.published ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      hostelPage.published ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Preview Panel */}
          <motion.div variants={item}>
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-zinc-400" />
              {showBooking
                ? t('hostelPage.directBooking')
                : t('hostelPage.preview')}
            </h2>

            {showBooking ? (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                {/* Booking Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                  <button
                    onClick={() => setShowBooking(false)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('hostelPage.back')}
                  </button>
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                    <CalendarDays className="h-4 w-4 text-emerald-500" />
                    {t('hostelPage.directBooking')}
                  </div>
                </div>
                {/* Booking Engine */}
                <div className="max-h-[600px] overflow-y-auto">
                  <BookingEngine />
                </div>
              </div>
            ) : (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Cover Image */}
              <div className="relative h-40 bg-zinc-100">
                {hostelPage.coverImage ? (
                  <img
                    src={hostelPage.coverImage}
                    alt={hostelPage.hostelName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-8 w-8 text-zinc-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-white font-semibold text-lg drop-shadow-sm">{hostelPage.hostelName}</h3>
                </div>
                <button
                  onClick={() => setShowBooking(true)}
                  className="absolute bottom-3 right-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg transition-colors cursor-pointer"
                >
                  {t('hostelPage.bookNow')}
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Description */}
                <p className="text-sm text-zinc-600 line-clamp-3">{hostelPage.description}</p>

                {/* Facilities */}
                {hostelPage.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hostelPage.facilities.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs text-zinc-500">
                  {hostelPage.contactEmail && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-zinc-400" />
                      <span>{hostelPage.contactEmail}</span>
                    </div>
                  )}
                  {hostelPage.contactPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-zinc-400" />
                      <span>{hostelPage.contactPhone}</span>
                    </div>
                  )}
                  {hostelPage.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-zinc-400" />
                      <span>{hostelPage.address}</span>
                    </div>
                  )}
                </div>

                {/* Book Now Button */}
                <button
                  onClick={() => setShowBooking(true)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {t('hostelPage.bookNow')}
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            )}
          </motion.div>
        </div>

        {/* ── Share Section ──────────────────────────────────── */}
        <motion.div variants={item}>
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 mb-3">
            <Share2 className="h-4 w-4 text-zinc-400" />
            {t('hostelPage.share')}
          </h2>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Share Link */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-600">
                  {t('hostelPage.shareLink')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 font-mono truncate">
                    {shareLink}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? (t('hostelPage.copied')) : (t('hostelPage.copy'))}
                  </button>
                </div>

                {/* Social Share Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Check out ${hostelPage.hostelName} on BunkDesk: https://${shareLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.instagram.com/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                    Instagram
                  </a>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-600">
                  {t('hostelPage.qrCode')}
                </label>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl h-40 flex flex-col items-center justify-center gap-2">
                  <QrCode className="h-10 w-10 text-zinc-300" />
                  <span className="text-xs text-zinc-400 font-medium">
                    {t('hostelPage.qrCodePlaceholder')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
