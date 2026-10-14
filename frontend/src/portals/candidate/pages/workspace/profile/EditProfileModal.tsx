// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: EditProfileModal
// Edits Candidate Name, Headline, City, Phone, and Open-to-work toggle
// Validates with zod + react-hook-form, title-cases on save
// ============================================================

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../../components/Modal';
import { INDIAN_CITIES, COUNTRY_CODES } from '../../../lib/constants';
import { splitFullName } from '../../../lib/name.util';
import { CandidateFullProfile } from '../../../lib/types';
import { useProfileSectionUpdate } from './hooks/useProfileSectionUpdate';

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  headline: z
    .string()
    .min(10, 'Headline must be at least 10 characters')
    .max(120, 'Headline must not exceed 120 characters'),
  city: z
    .string()
    .min(2, 'Please select or enter a valid city name'),
  phone: z
    .string()
    .min(6, 'Please enter a valid phone number (at least 6 digits)')
    .max(15, 'Phone number must not exceed 15 digits'),
  openToWork: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateFullProfile;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const updateMutation = useProfileSectionUpdate();
  const [citySearch, setCitySearch] = useState(profile.location || '');
  const [cityFocused, setCityFocused] = useState(false);

  // Extract phone country code or fallback to +91
  const existingCode = COUNTRY_CODES.find((c) => profile.phone?.startsWith(c.code))?.code || '+91';
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    profile.phoneCountryCode || existingCode,
  );

  const rawPhone = profile.phone
    ? profile.phone.replace(new RegExp(`^\\${selectedCountryCode}`), '').replace(/^\+91/, '').trim()
    : '';

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      headline: profile.headline || '',
      city: profile.location || '',
      phone: rawPhone,
      openToWork: Boolean(profile.openToWork),
    },
  });

  const selectedCity = watch('city');

  const cityOptions = [...INDIAN_CITIES, 'Other / International'];
  const filteredCities = cityOptions.filter((city) =>
    city.toLowerCase().includes(citySearch.toLowerCase()),
  );

  const onSubmit = async (values: ProfileFormValues) => {
    const { firstName, lastName } = splitFullName(values.fullName);
    const normalizedHeadline = toTitleCase(values.headline);
    const normalizedCity = values.city === 'Other / International'
      ? toTitleCase(citySearch !== 'Other / International' ? citySearch : 'International')
      : toTitleCase(values.city);

    await updateMutation.mutateAsync({
      firstName,
      lastName: lastName ?? undefined,
      fullName: values.fullName.trim(),
      headline: normalizedHeadline,
      location: normalizedCity,
      phone: values.phone ? `${selectedCountryCode}${values.phone}` : undefined,
      phoneCountryCode: selectedCountryCode,
      openToWork: values.openToWork,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile Details"
      subtitle="Update your basic professional identity and job-seeking status"
      isDirty={isDirty}
      isSubmitting={isSubmitting || updateMutation.isPending}
      onSubmit={handleSubmit(onSubmit)}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-xs font-semibold text-[#1B1A17] mb-1.5">
            Full Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            {...register('fullName')}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            placeholder="e.g. Aditi Sharma"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
              errors.fullName ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
            }`}
          />
          {errors.fullName && (
            <p id="fullName-error" className="text-xs text-[#DC2626] mt-1" role="alert">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Headline */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="headline" className="block text-xs font-semibold text-[#1B1A17]">
              Headline <span className="text-[#DC2626]">*</span>
            </label>
            <span className="text-[11px] text-[#5C564E]">10–120 characters</span>
          </div>
          <input
            id="headline"
            type="text"
            {...register('headline')}
            aria-invalid={Boolean(errors.headline)}
            aria-describedby={errors.headline ? 'headline-error' : undefined}
            placeholder="e.g. Senior Frontend Engineer | React & TypeScript"
            maxLength={120}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
              errors.headline ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
            }`}
          />
          {errors.headline && (
            <p id="headline-error" className="text-xs text-[#DC2626] mt-1" role="alert">
              {errors.headline.message}
            </p>
          )}
        </div>

        {/* City Autocomplete */}
        <div className="relative">
          <label htmlFor="city" className="block text-xs font-semibold text-[#1B1A17] mb-1.5">
            City <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="city"
            type="text"
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setValue('city', e.target.value, { shouldDirty: true, shouldValidate: true });
            }}
            onFocus={() => setCityFocused(true)}
            onBlur={() => {
              setTimeout(() => setCityFocused(false), 200);
            }}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? 'city-error' : undefined}
            placeholder="Search city in India..."
            autoComplete="off"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 transition-all ${
              errors.city ? 'border-[#DC2626] bg-[#FEF2F2]/30' : 'border-[#E8DFD4] bg-white'
            }`}
          />
          {cityFocused && filteredCities.length > 0 && (
            <ul
              className="absolute z-20 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-[#E8DFD4] rounded-xl shadow-lg py-1 text-xs text-[#1B1A17]"
              role="listbox"
            >
              {filteredCities.map((c) => (
                <li
                  key={c}
                  role="option"
                  aria-selected={selectedCity === c}
                  onMouseDown={() => {
                    setCitySearch(c);
                    setValue('city', c, { shouldDirty: true, shouldValidate: true });
                    setCityFocused(false);
                  }}
                  className="px-3.5 py-2 hover:bg-[#FAF6F1] hover:text-[#C2410C] cursor-pointer transition-colors"
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
          {errors.city && (
            <p id="city-error" className="text-xs text-[#DC2626] mt-1" role="alert">
              {errors.city.message}
            </p>
          )}
        </div>

        {/* Phone Number with Country Code Dropdown */}
        <div>
          <label htmlFor="phone" className="block text-xs font-semibold text-[#1B1A17] mb-1.5">
            Phone Number <span className="text-[#DC2626]">*</span>
          </label>
          <div className="flex rounded-xl border border-[#E8DFD4] overflow-hidden focus-within:ring-2 focus-within:ring-[#C2410C]/20 bg-white">
            <select
              value={selectedCountryCode}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              aria-label="Country code"
              className="px-2.5 py-2.5 bg-[#FAF6F1] text-xs font-semibold text-[#1B1A17] border-r border-[#E8DFD4] focus:outline-none cursor-pointer hover:bg-[#F2E9E0] transition-colors max-w-[130px] sm:max-w-[160px] truncate"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.country})
                </option>
              ))}
            </select>
            <input
              id="phone"
              type="tel"
              maxLength={15}
              {...register('phone')}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              placeholder="9876543210"
              className="w-full px-3.5 py-2.5 text-sm text-[#1B1A17] placeholder-[#5C564E]/60 focus:outline-none bg-white"
            />
          </div>
          {errors.phone && (
            <p id="phone-error" className="text-xs text-[#DC2626] mt-1" role="alert">
              {errors.phone.message}
            </p>
          )}
        </div>

        {/* Open to Work Toggle */}
        <div className="pt-2">
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/50 cursor-pointer hover:bg-[#FAF6F1] transition-colors">
            <div>
              <span className="text-xs font-semibold text-[#1B1A17] block">
                Open to work
              </span>
              <span className="text-[11px] text-[#5C564E] block mt-0.5">
                Signal to hiring managers that you are actively seeking opportunities
              </span>
            </div>
            <Controller
              name="openToWork"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  aria-label="Open to work status"
                  className="w-5 h-5 rounded border-[#E8DFD4] text-[#C2410C] focus:ring-[#C2410C] accent-[#C2410C] cursor-pointer"
                />
              )}
            />
          </label>
        </div>
      </div>
    </Modal>
  );
};
export default EditProfileModal;
