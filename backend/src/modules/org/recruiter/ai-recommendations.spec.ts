import { AiService } from '../money/ai.service';
import { OrgContext } from '../common/org-context';
const ctx = { organisationId: 'org', userId: 'recruiter', role: 'RECRUITER' } as OrgContext;
const cards = [{ id: 'a', headline: 'Java engineer', skills: ['Java'], experienceYears: 3 }];
function setup(raw: string) {
  const prisma = {
    orgSettings: { findUnique: jest.fn().mockResolvedValue({ aiEnabled: true }) },
    aiRun: { create: jest.fn().mockResolvedValue({}) },
  };
  const tokens = {
    reserve: jest.fn().mockResolvedValue({ id: 'r' }),
    commit: jest.fn().mockResolvedValue({}),
    release: jest.fn().mockResolvedValue({}),
  };
  const service = new AiService(
    prisma as never,
    { audit: jest.fn().mockResolvedValue({}) } as never,
    tokens as never,
  );
  jest.spyOn(service as never, 'geminiConfigured' as never).mockReturnValue(true as never);
  const provider = jest.spyOn(service as never, 'gemini' as never).mockResolvedValue(raw as never);
  return { service, prisma, tokens, provider };
}
describe('Optional AI recommendations', () => {
  it('uses the existing token reservation and only accepts supplied candidate IDs', async () => {
    const { service, tokens, provider } = setup('[{"id":"a","reason":"Java matches the required skill"}]');
    const result = await service.rankRecruiterProfiles(
      ctx,
      'candidate',
      { title: 'Java engineer', skills: ['Java'] },
      cards,
    );
    expect(result[0].id).toBe('a');
    expect(tokens.commit).toHaveBeenCalledWith('r');
    const prompt = String(provider.mock.calls[0][0]);
    expect(prompt).not.toContain('email');
    expect(prompt).not.toContain('resumeText');
  });
  it('releases reserved tokens when the provider invents an ID', async () => {
    const { service, tokens } = setup('[{"id":"foreign","reason":"Good"}]');
    await expect(
      service.rankRecruiterProfiles(ctx, 'candidate', { title: 'Engineer', skills: ['Java'] }, cards),
    ).rejects.toThrow();
    expect(tokens.release).toHaveBeenCalledWith('r');
    expect(tokens.commit).not.toHaveBeenCalled();
  });
  it('honours the organisation AI switch before reserving tokens', async () => {
    const { service, prisma, tokens } = setup('[]');
    prisma.orgSettings.findUnique.mockResolvedValue({ aiEnabled: false });
    await expect(
      service.rankRecruiterProfiles(ctx, 'candidate', { title: 'Engineer', skills: [] }, cards),
    ).rejects.toThrow('turned off');
    expect(tokens.reserve).not.toHaveBeenCalled();
  });
});
