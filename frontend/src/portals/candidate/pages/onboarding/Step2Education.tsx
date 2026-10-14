// ============================================================
// Clyptus Job Portal - Candidate Portal
// Step 2: Education Form
// Qualification chips, degree & institution autocomplete, years validation, "+ Add another"
// ============================================================

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  QUALIFICATION_OPTIONS,
  POPULAR_DEGREES,
  POPULAR_INSTITUTIONS,
} from '../../lib/constants';
import { Button, Input, Field } from '@/portals/org/ui/ui';
import { Plus, Trash2, GraduationCap, Building2, Calendar, Award, AlertCircle } from 'lucide-react';

export interface EducationEntry {
  qualification?: string;
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  startYear: number;
  endYear: number;
  grade?: string;
}

export interface Step2FormData {
  highestQualification?: string;
  education: EducationEntry[];
}

interface Step2EducationProps {
  initialData: Partial<Step2FormData>;
  onSave: (data: Step2FormData) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export const Step2Education: React.FC<Step2EducationProps> = ({
  initialData,
  onSave,
  onBack,
  isLoading,
}) => {
  const currentYear = new Date().getFullYear();

  const defaultEducationList: EducationEntry[] =
    initialData.education && initialData.education.length > 0
      ? initialData.education
      : [
          {
            qualification: 'Graduate',
            degree: 'Bachelor of Technology (B.Tech)',
            fieldOfStudy: 'Computer Science',
            institution: '',
            startYear: currentYear - 4,
            endYear: currentYear,
            grade: '',
          },
        ];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step2FormData>({
    defaultValues: {
      highestQualification: initialData.highestQualification || 'Graduate',
      education: defaultEducationList,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'education',
  });

  const selectedHighest = watch('highestQualification');

  const onSubmit = async (data: Step2FormData) => {
    // Validate that all end years are >= start years
    for (const edu of data.education) {
      if (edu.startYear && edu.endYear && edu.endYear < edu.startYear) {
        return;
      }
    }
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-bold font-serif text-slate-900">Education Background</h2>
        <p className="text-sm text-slate-500 mt-1">
          Add your academic qualifications. Indian recruiters look for complete degree and college details.
        </p>
      </div>

      {/* Highest Qualification Chips */}
      <div>
        <label className="text-sm font-semibold text-slate-800 block mb-2">
          Highest Qualification *
        </label>
        <Controller
          name="highestQualification"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {QUALIFICATION_OPTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => field.onChange(q)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                    field.value === q
                      ? 'bg-orange-600 text-white ring-2 ring-orange-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Education Entries List */}
      <div className="space-y-6">
        {fields.map((field, index) => {
          const startYearValue = watch(`education.${index}.startYear`);
          const endYearValue = watch(`education.${index}.endYear`);
          const hasYearError = startYearValue && endYearValue && Number(endYearValue) < Number(startYearValue);

          return (
            <div
              key={field.id}
              className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  Education Record #{index + 1}
                </span>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 p-1 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Degree / Course */}
                <div>
                  <Field
                    label="Degree / Course *"
                    error={errors.education?.[index]?.degree?.message}
                  >
                    <div className="relative">
                      <Input
                        list={`degree-suggestions-${index}`}
                        {...register(`education.${index}.degree`, {
                          required: 'Degree name is required',
                          minLength: { value: 2, message: 'Degree must be at least 2 characters' },
                        })}
                        placeholder="e.g. B.Tech in Computer Science"
                      />
                      <datalist id={`degree-suggestions-${index}`}>
                        {(POPULAR_DEGREES[selectedHighest || 'Graduate'] || POPULAR_DEGREES.Graduate).map((deg) => (
                          <option key={deg} value={deg} />
                        ))}
                      </datalist>
                    </div>
                  </Field>
                </div>

                {/* Specialization / Field of Study */}
                <div>
                  <Field label="Specialization">
                    <Input
                      {...register(`education.${index}.fieldOfStudy`)}
                      placeholder="e.g. Computer Science & Engineering"
                    />
                  </Field>
                </div>

                {/* Institution / University */}
                <div className="sm:col-span-2">
                  <Field
                    label="College / University *"
                    error={errors.education?.[index]?.institution?.message}
                  >
                    <div className="relative">
                      <Input
                        list={`institution-suggestions-${index}`}
                        {...register(`education.${index}.institution`, {
                          required: 'College or institution name is required',
                          minLength: { value: 3, message: 'Institution must be at least 3 characters' },
                        })}
                        placeholder="Search your college or university"
                        className="pl-9"
                      />
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <datalist id={`institution-suggestions-${index}`}>
                        {POPULAR_INSTITUTIONS.map((inst) => (
                          <option key={inst} value={inst} />
                        ))}
                      </datalist>
                    </div>
                  </Field>
                </div>

                {/* Start Year */}
                <div>
                  <Field
                    label="Start Year *"
                    error={errors.education?.[index]?.startYear?.message}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min={1980}
                        max={currentYear + 5}
                        {...register(`education.${index}.startYear`, {
                          required: 'Start year is required',
                          valueAsNumber: true,
                          min: { value: 1980, message: 'Year must be 1980 or later' },
                          max: { value: currentYear + 5, message: 'Invalid start year' },
                        })}
                        placeholder="2018"
                        className="pl-9"
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </Field>
                </div>

                {/* End / Expected Year */}
                <div>
                  <Field
                    label="End / Expected Year *"
                    error={errors.education?.[index]?.endYear?.message || (hasYearError ? 'End year cannot be earlier than start year' : undefined)}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min={1980}
                        max={currentYear + 10}
                        {...register(`education.${index}.endYear`, {
                          required: 'End year is required',
                          valueAsNumber: true,
                          validate: (end) => {
                            const start = watch(`education.${index}.startYear`);
                            return !start || end >= start || 'End year must be greater than or equal to start year';
                          },
                        })}
                        placeholder="2022"
                        className="pl-9"
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </Field>
                </div>

                {/* Grading (CGPA / Percentage) */}
                <div className="sm:col-span-2">
                  <Field label="Grading (CGPA or Percentage)">
                    <div className="relative">
                      <Input
                        {...register(`education.${index}.grade`)}
                        placeholder="e.g. 8.5 CGPA or 85%"
                        className="pl-9"
                      />
                      <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Another Education Button */}
      <div>
        <button
          type="button"
          onClick={() =>
            append({
              degree: '',
              fieldOfStudy: '',
              institution: '',
              startYear: currentYear - 4,
              endYear: currentYear,
              grade: '',
            })
          }
          className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl text-xs font-semibold text-slate-600 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Another Education Degree
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg border-slate-300 text-slate-700"
          disabled={isLoading}
        >
          Back
        </Button>

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
