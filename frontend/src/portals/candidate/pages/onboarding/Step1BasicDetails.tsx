// ============================================================
// Clyptus Job Portal - Candidate Portal
// Step 1: Basic Details Form
// Prefilled name/email, single Full Name input, 10-digit mobile, Indian city autocomplete, 18+ check, Fresher toggle
// React Hook Form + Zod, inline accessible errors (aria-invalid, aria-describedby)
// ============================================================

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { INDIAN_CITIES } from '../../lib/constants';
import { Button, Input } from '@/portals/org/ui/ui';
import { MapPin, User, Mail, Phone, Calendar, Briefcase, GraduationCap } from 'lucide-react';

export const step1Schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(200, { message: 'Full name cannot exceed 200 characters' })
    .regex(/^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.'-]+$/, {
      message: 'Full name can only contain letters, spaces, dots, hyphens, and apostrophes',
    }),
  email: z.string().email({ message: 'A valid email address is required' }),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, {
      message: 'Mobile number must be a valid 10-digit Indian phone number starting with 6-9',
    }),
  phoneCountryCode: z.string().default('+91'),
  location: z
    .string()
    .trim()
    .min(2, { message: 'City is required' })
    .max(100, { message: 'City cannot exceed 100 characters' }),
  dateOfBirth: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const dob = new Date(val);
        if (isNaN(dob.getTime())) return false;
        const ageDiff = Date.now() - dob.getTime();
        const ageDate = new Date(ageDiff);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        return age >= 18;
      },
      { message: 'Candidate must be at least 18 years of age' },
    ),
  isFresher: z.boolean({ required_error: 'Work status must be declared' }),
  gender: z.string().optional(),
});

export type Step1FormData = z.infer<typeof step1Schema>;

interface Step1BasicDetailsProps {
  initialData: Partial<Step1FormData>;
  onSave: (data: Step1FormData) => Promise<void>;
  isLoading: boolean;
  serverFieldErrors?: Record<string, string>;
}

export const Step1BasicDetails: React.FC<Step1BasicDetailsProps> = ({
  initialData,
  onSave,
  isLoading,
  serverFieldErrors = {},
}) => {
  const [citySearch, setCitySearch] = useState(initialData.location || '');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: initialData.fullName || '',
      email: initialData.email || '',
      phone: initialData.phone ? initialData.phone.replace(/^\+91/, '').trim() : '',
      phoneCountryCode: initialData.phoneCountryCode || '+91',
      location: initialData.location || '',
      dateOfBirth: initialData.dateOfBirth ? initialData.dateOfBirth.slice(0, 10) : '',
      isFresher: initialData.isFresher !== undefined ? initialData.isFresher : true,
      gender: initialData.gender || '',
    },
  });

  const selectedLocation = watch('location');

  const filteredCities = INDIAN_CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase()),
  );

  const onSubmit = async (data: Step1FormData) => {
    await onSave(data);
  };

  const fullNameError = errors.fullName?.message || serverFieldErrors.fullName;
  const phoneError = errors.phone?.message || serverFieldErrors.phone;
  const locationError = errors.location?.message || serverFieldErrors.location;
  const dobError = errors.dateOfBirth?.message || serverFieldErrors.dateOfBirth;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-bold font-serif text-slate-900">Basic Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tell us about yourself so hiring teams know who you are and where you are located.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name (Single Input) */}
        <div className="sm:col-span-2 space-y-1.5">
          <label htmlFor="step1-fullName" className="text-sm font-semibold text-slate-800 flex items-center justify-between">
            <span>Full Name *</span>
          </label>
          <div className="relative">
            <Input
              id="step1-fullName"
              {...register('fullName')}
              placeholder="e.g. Aman Verma"
              className={`pl-9 ${fullNameError ? 'border-red-500 focus:ring-red-500' : ''}`}
              aria-invalid={Boolean(fullNameError)}
              aria-describedby={fullNameError ? 'fullName-error' : undefined}
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
          {fullNameError && (
            <p id="fullName-error" role="alert" className="text-xs text-red-600 font-medium mt-1">
              {fullNameError}
            </p>
          )}
        </div>

        {/* Email Address (Read-only) */}
        <div className="space-y-1.5">
          <label htmlFor="step1-email" className="text-sm font-semibold text-slate-800">
            Email Address
          </label>
          <div className="relative">
            <Input
              id="step1-email"
              {...register('email')}
              readOnly
              disabled
              className="pl-9 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
          <span className="text-[11px] text-slate-400 block">
            Associated with your login credentials
          </span>
        </div>

        {/* Mobile Number with Country Code */}
        <div className="space-y-1.5">
          <label htmlFor="step1-phone" className="text-sm font-semibold text-slate-800">
            Mobile Number *
          </label>
          <div className="flex gap-2">
            <select
              {...register('phoneCountryCode')}
              className="w-20 px-2 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              aria-label="Country Code"
            >
              <option value="+91">+91 (IN)</option>
              <option value="+1">+1 (US)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+971">+971 (AE)</option>
              <option value="+65">+65 (SG)</option>
            </select>

            <div className="relative flex-1">
              <Input
                id="step1-phone"
                type="tel"
                maxLength={10}
                {...register('phone')}
                placeholder="9876543210"
                className={`pl-9 ${phoneError ? 'border-red-500 focus:ring-red-500' : ''}`}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? 'phone-error' : undefined}
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
          {phoneError && (
            <p id="phone-error" role="alert" className="text-xs text-red-600 font-medium mt-1">
              {phoneError}
            </p>
          )}
        </div>

        {/* Current City Autocomplete */}
        <div className="sm:col-span-2 relative space-y-1.5">
          <label htmlFor="step1-city" className="text-sm font-semibold text-slate-800">
            Current City *
          </label>
          <div className="relative">
            <Input
              id="step1-city"
              type="text"
              value={citySearch}
              onChange={(e: any) => {
                setCitySearch(e.target.value);
                setShowCityDropdown(true);
                setValue('location', e.target.value, { shouldValidate: true });
              }}
              onFocus={() => setShowCityDropdown(true)}
              placeholder="Search Indian city (e.g. Bengaluru, Mumbai, Pune)"
              className={`pl-9 ${locationError ? 'border-red-500 focus:ring-red-500' : ''}`}
              aria-invalid={Boolean(locationError)}
              aria-describedby={locationError ? 'location-error' : undefined}
            />
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />

            <input
              type="hidden"
              {...register('location')}
            />
          </div>

          {locationError && (
            <p id="location-error" role="alert" className="text-xs text-red-600 font-medium mt-1">
              {locationError}
            </p>
          )}

          {/* Autocomplete Dropdown */}
          {showCityDropdown && (
            <div
              className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg"
              onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
            >
              {filteredCities.length > 0 ? (
                filteredCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setCitySearch(city);
                      setValue('location', city, { shouldValidate: true });
                      setShowCityDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 hover:text-orange-900 transition-colors flex items-center justify-between ${
                      selectedLocation === city ? 'bg-orange-50 font-semibold text-orange-900' : 'text-slate-700'
                    }`}
                  >
                    <span>{city}</span>
                    <span className="text-[11px] text-slate-400">India</span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-500 text-center">
                  No matching Indian cities found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date of Birth (Optional with 18+ check) */}
        <div className="space-y-1.5">
          <label htmlFor="step1-dob" className="text-sm font-semibold text-slate-800">
            Date of Birth (Optional)
          </label>
          <div className="relative">
            <Input
              id="step1-dob"
              type="date"
              {...register('dateOfBirth')}
              className={`pl-9 ${dobError ? 'border-red-500 focus:ring-red-500' : ''}`}
              aria-invalid={Boolean(dobError)}
              aria-describedby={dobError ? 'dob-error' : undefined}
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
          {dobError ? (
            <p id="dob-error" role="alert" className="text-xs text-red-600 font-medium mt-1">
              {dobError}
            </p>
          ) : (
            <span className="text-[11px] text-slate-400 block">
              You must be at least 18 years old
            </span>
          )}
        </div>

        {/* Gender (Optional) */}
        <div className="space-y-1.5">
          <label htmlFor="step1-gender" className="text-sm font-semibold text-slate-800">
            Gender (Optional)
          </label>
          <select
            id="step1-gender"
            {...register('gender')}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Work Status Toggle: Fresher vs Experienced */}
      <div className="pt-2">
        <label className="text-sm font-semibold text-slate-800 block mb-2">
          Work Status *
        </label>
        <Controller
          name="isFresher"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => field.onChange(true)}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  field.value === true
                    ? 'border-orange-600 bg-orange-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    field.value === true ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${field.value === true ? 'text-orange-950' : 'text-slate-800'}`}>
                    I am a Fresher
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Recent graduate, college student, or looking for entry-level roles
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => field.onChange(false)}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  field.value === false
                    ? 'border-orange-600 bg-orange-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    field.value === false ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${field.value === false ? 'text-orange-950' : 'text-slate-800'}`}>
                    I have Experience
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Have worked or currently working in a corporate or full-time role
                  </div>
                </div>
              </button>
            </div>
          )}
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex justify-end">
        <Button
          type="submit"
          variant="primary"
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-sm"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </form>
  );
};
