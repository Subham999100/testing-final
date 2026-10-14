import { describe, it, expect } from "vitest";
import { careerSegments, employmentDates, employmentPeriod } from "./career";
const now = new Date(2026, 9, 7);
describe("Employment chronology", () => {
  it("shows structured month/year and current duration", () => {
    expect(
      employmentPeriod(
        {
          organisation: "Example Ltd",
          title: "Engineer",
          startMonth: "2023-12",
          current: true,
        },
        now,
      ),
    ).toBe("Dec 2023 – Present · 2y 10m");
  });
  it("preserves recognized legacy dates but never invents months", () => {
    expect(
      employmentDates(
        {
          organisation: "Example Ltd",
          title: "Engineer",
          period: "Aug 2023 – Present",
        },
        now,
      )?.current,
    ).toBe(true);
    expect(
      employmentDates(
        {
          organisation: "Example Ltd",
          title: "Engineer",
          period: "2020 - 2023",
        },
        now,
      ),
    ).toBeNull();
    expect(
      employmentPeriod(
        {
          organisation: "Example Ltd",
          title: "Engineer",
          period: "2020 - 2023",
        },
        now,
      ),
    ).toBe("2020 - 2023");
  });
  it("does not infer gaps inside overlapping employment", () => {
    const history = [
      {
        organisation: "Example Ltd",
        title: "A",
        startMonth: "2020-01",
        endMonth: "2024-01",
      },
      {
        organisation: "Example Ltd",
        title: "B",
        startMonth: "2021-01",
        endMonth: "2021-06",
      },
      {
        organisation: "Example Ltd",
        title: "C",
        startMonth: "2023-01",
        endMonth: "2025-01",
      },
    ];
    expect(careerSegments(history, now).gaps).toEqual([]);
  });
  it("identifies recorded date gaps only for complete histories", () => {
    const history = [
      {
        organisation: "Example Ltd",
        title: "A",
        startMonth: "2020-01",
        endMonth: "2020-05",
      },
      {
        organisation: "Example Ltd",
        title: "B",
        startMonth: "2020-09",
        endMonth: "2022-01",
      },
    ];
    const gaps = careerSegments(history, now).gaps;
    expect(gaps).toHaveLength(1);
    expect(gaps[0].end - gaps[0].start).toBe(4);
    expect(
      careerSegments(
        [...history, { organisation: "Example Ltd", title: "Undated role" }],
        now,
      ).gaps,
    ).toEqual([]);
  });
});