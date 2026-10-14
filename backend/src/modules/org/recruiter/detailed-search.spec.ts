import { RecruiterService } from './recruiter.service';
import { expandSynonyms, parseKeywords, plainKeywords, positiveTerms } from './search';
import { OrgContext } from '../common/org-context';
const ctx={organisationId:'org-a',userId:'member-a',permissions:['candidates.search']} as OrgContext;
function setup(){const prisma={$queryRaw:jest.fn().mockResolvedValue([]),$transaction:jest.fn().mockResolvedValue([[{total:400n}],[{id:'a'},{id:'b'}]]),candidate:{findMany:jest.fn().mockResolvedValue([])}};return {prisma,service:new RecruiterService(prisma as never,{} as never,{} as never,{} as never)};}
describe('Detailed search and range selection',()=>{
 it('selects inclusive absolute range 101–292 without exposing contact fields',async()=>{const {prisma,service}=setup();const r=await service.selectRange(ctx,{from:101,to:292,filters:{page:4,limit:20,search:'React',sort:'experience'}});expect(r).toEqual({candidateIds:['a','b'],total:400,from:101,to:102});const sql=prisma.$queryRaw.mock.calls[1][0];expect(sql.values.slice(-2)).toEqual([192,100]);expect(sql.text).toContain('c.id ASC');expect(prisma.candidate.findMany).not.toHaveBeenCalled();});
 it.each([[0,3],[10,9],[1,1001]])('rejects invalid/oversized range %s–%s',async(from,to)=>{const{service}=setup();await expect(service.selectRange(ctx,{from,to,filters:{page:1,limit:20}})).rejects.toThrow();});
 it('binds exclusions and history filters and retains tenant scoping',async()=>{const{prisma,service}=setup();await service.selectRange(ctx,{from:1,to:3,filters:{page:1,limit:20,excludeCompany:"O'Reilly",company:'Acme',companyScope:'past',ug:'specific',ugText:'Engineering',insights:'portfolio,certified',hideEmailed:'true'}});const sql=prisma.$queryRaw.mock.calls[1][0];expect(sql.text).not.toContain("O'Reilly");expect(sql.values).toContain("%O'Reilly%");expect(sql.values).toContain('org-a');expect(sql.text).toContain('jsonb_array_elements');expect(sql.text).toContain('recruiter_email_recipients');});
 it('preserves plain words and expands only explicit aliases when enabled',()=>{expect(positiveTerms(plainKeywords('Java AND AWS'))).toEqual(['Java','AND','AWS']);expect(positiveTerms(expandSynonyms(parseKeywords('JS'),false))).toEqual(['js','javascript']);expect(expandSynonyms(parseKeywords('JS'),true)).toEqual({term:'JS'});});
  it('rejects unknown insights and an empty specific qualification',async()=>{const{service}=setup();await expect(service.search(ctx,{page:1,limit:20,insights:'invented'})).rejects.toThrow('Unknown');await expect(service.search(ctx,{page:1,limit:20,ug:'specific'})).rejects.toThrow('specific');});
  it('validates passing year From <= To and minAge <= maxAge',async()=>{
    const{service}=setup();
    await expect(service.search(ctx,{page:1,limit:20,ug:'any',ugYearFrom:2024,ugYearTo:2020})).rejects.toThrow('Passing year From cannot be after To for UG');
    await expect(service.search(ctx,{page:1,limit:20,minAge:40,maxAge:30})).rejects.toThrow('Minimum age exceeds maximum');
  });
  it('binds education course, institute, and passing year into single jsonb subquery',async()=>{
    const{prisma,service}=setup();
    await service.search(ctx,{page:1,limit:20,ug:'specific',ugCourse:'B.Tech',ugInstitute:'IIT',ugYearFrom:2018,ugYearTo:2022,languages:'Hindi,English',minAge:22,maxAge:35,includeUnknownAge:'true'});
    const sql=prisma.$queryRaw.mock.calls[0][0];
    expect(sql.text).toContain('jsonb_array_elements');
    expect(sql.values).toContain('%B.Tech%');
    expect(sql.values).toContain('%IIT%');
    expect(sql.values).toContain(2018);
    expect(sql.values).toContain(2022);
    expect(sql.text).toContain('languages');
    expect(sql.values).toContain('%Hindi%');
    expect(sql.values).toContain('%English%');
  });
});