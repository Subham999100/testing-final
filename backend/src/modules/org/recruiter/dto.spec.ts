import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProfessionalProfileDto, SavedSearchDto, TalentQueryDto } from './dto';
describe('Recruiter input validation', () => {
  it('rejects oversized pages and negative salary', async () =>
    expect((await validate(plainToInstance(TalentQueryDto, { limit: '500', minSalary: '-1' }))).length).toBe(
      2,
    ));
  it('validates nested history entries', async () =>
    expect(
      (
        await validate(
          plainToInstance(ProfessionalProfileDto, { education: [{ title: '', organisation: 123 }] }),
        )
      ).length,
    ).toBeGreaterThan(0));
  it('does not permit candidate activity to be forged through profile editing', async () => {
    const errors = await validate(
      plainToInstance(ProfessionalProfileDto, { lastActiveAt: new Date().toISOString() }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors).toHaveLength(1);
  });
  it('validates nested saved-search query limits', async () =>
    expect(
      (
        await validate(
          plainToInstance(SavedSearchDto, { name: 'Test', shared: false, filters: { limit: 500 } }),
        )
      ).length,
    ).toBeGreaterThan(0));
});
