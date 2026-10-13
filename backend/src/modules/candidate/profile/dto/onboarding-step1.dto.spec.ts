import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OnboardingStep1Dto } from './onboarding-step.dto';

describe('OnboardingStep1Dto validation', () => {
  it('passes validation with a single-word name (e.g., "Hema")', async () => {
    const payload = {
      fullName: 'Hema',
      phone: '9876543210',
      location: 'Bengaluru',
      isFresher: true,
    };

    const dto = plainToInstance(OnboardingStep1Dto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a three-word name (e.g., "Hema Sriram Ganti")', async () => {
    const payload = {
      fullName: 'Hema Sriram Ganti',
      phone: '9876543210',
      location: 'Hyderabad',
      isFresher: false,
    };

    const dto = plainToInstance(OnboardingStep1Dto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with names containing dots, hyphens, and apostrophes', async () => {
    const payload = {
      fullName: "G. Hema Sriram D'Souza-Roy",
      phone: '9876543210',
      location: 'Mumbai',
      isFresher: true,
    };

    const dto = plainToInstance(OnboardingStep1Dto, payload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when fullName is empty or shorter than 2 characters', async () => {
    const payload = {
      fullName: 'H',
      phone: '9876543210',
      location: 'Bengaluru',
      isFresher: true,
    };

    const dto = plainToInstance(OnboardingStep1Dto, payload);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const nameError = errors.find((e) => e.property === 'fullName');
    expect(nameError).toBeDefined();
    expect(nameError?.constraints?.minLength).toBe('Full name must be at least 2 characters');
  });

  it('fails validation when fullName contains invalid symbols or numbers', async () => {
    const payload = {
      fullName: 'Hema123 <script>',
      phone: '9876543210',
      location: 'Bengaluru',
      isFresher: true,
    };

    const dto = plainToInstance(OnboardingStep1Dto, payload);
    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'fullName');
    expect(nameError).toBeDefined();
    expect(nameError?.constraints?.matches).toBe(
      'Full name can only contain letters, spaces, dots, hyphens, and apostrophes',
    );
  });
});
