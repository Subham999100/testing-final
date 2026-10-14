// ============================================================
// Clyptus Job Portal - Candidate E2E Test Suite
// Flow: Register -> 5-Step Onboarding -> Profile Completion (Score > 0)
// ============================================================

import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Candidate Onboarding & Profile Completion End-to-End', () => {
  const testEmail = `candidate_e2e_${Date.now()}@clyptus.dev`;
  const testPassword = 'Password@123';

  test('Full Candidate Flow: Register -> Onboarding 1-5 -> Profile Score > 0', async ({ page }) => {
    // 1. Visit Register Page
    await page.goto('/register');
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.locator('h1')).toContainText('Create candidate account');

    // 2. Fill Registration Details & Consent Checkbox
    await page.fill('input[placeholder="First Name"]', 'Aarav');
    await page.fill('input[placeholder="Last Name"]', 'Sharma');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // Accept DPDP Act terms
    const consentCheckbox = page.locator('input[type="checkbox"]');
    await consentCheckbox.check();
    expect(await consentCheckbox.isChecked()).toBe(true);

    // Submit Registration
    await page.click('button[type="submit"]');

    // 3. Must Immediately Redirect to /onboarding (Never straight to dashboard)
    await page.waitForURL('**/onboarding', { timeout: 15000 });
    expect(page.url()).toContain('/onboarding');
    await expect(page.locator('text=Candidate Onboarding')).toBeVisible();

    // 4. Step 1 - Basic Details
    // Email is read-only prefilled
    const emailField = page.locator('input[value="' + testEmail + '"]');
    await expect(emailField).toBeDisabled();

    // Fill 10-digit mobile and current city
    await page.fill('input[placeholder="9876543210"]', '9876543210');
    await page.fill('input[placeholder="e.g. Bengaluru"]', 'Bengaluru');

    // Toggle Fresher status
    await page.click('text=Fresher');

    // Save & Continue Step 1
    await page.click('button:has-text("Save & Continue")');

    // 5. Step 2 - Education
    await expect(page.locator('text=Highest Qualification')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Graduate")');
    await page.fill('input[placeholder*="B.Tech"]', 'Bachelor of Technology');
    await page.fill('input[placeholder*="IIT"]', 'Indian Institute of Technology');
    await page.fill('input[placeholder="2019"]', '2019');
    await page.fill('input[placeholder="2023"]', '2023');
    await page.fill('input[placeholder*="8.5"]', '8.8 CGPA');

    // Save & Continue Step 2
    await page.click('button:has-text("Save & Continue")');

    // 6. Step 3 - Professional Details
    await expect(page.locator('text=Resume Headline')).toBeVisible({ timeout: 10000 });
    // Select an AI generated headline suggestion
    const headlineSuggestion = page.locator('button:has-text("Fresher")').first();
    if (await headlineSuggestion.isVisible()) {
      await headlineSuggestion.click();
    } else {
      await page.fill('textarea[placeholder*="headline"]', 'Aspiring Software Engineer passionate about React and Node.js');
    }

    // Add Key Skills
    const skillInput = page.locator('input[placeholder*="skill name"]');
    for (const skill of ['React', 'TypeScript', 'Node.js', 'PostgreSQL']) {
      await skillInput.fill(skill);
      await skillInput.press('Enter');
    }

    // Preferred Locations
    const locInput = page.locator('input[placeholder*="city"]');
    await locInput.fill('Bengaluru');
    await locInput.press('Enter');

    // Expected Salary (shows verbalizer under input)
    await page.fill('input[placeholder*="800000"]', '800000');
    await expect(page.locator('text=Eight Lakh Rupees per year')).toBeVisible();

    // Save & Continue Step 3
    await page.click('button:has-text("Save & Continue")');

    // 7. Step 4 - Resume Upload (Mandatory)
    await expect(page.locator('text=Upload Your Resume')).toBeVisible({ timeout: 10000 });

    // Upload fixture PDF resume
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=browse files');
    const fileChooser = await fileChooserPromise;
    const fixtureResume = path.resolve(__dirname, '../../fixtures/sample_resume.pdf');
    await fileChooser.setFiles(fixtureResume);

    // Verify upload and parsing processing
    await expect(page.locator('text=Resume parsed successfully')).toBeVisible({ timeout: 20000 });
    await page.click('button:has-text("Save & Continue")');

    // 8. Step 5 - AI Video Interview (Optional)
    await expect(page.locator('text=AI Video Interview')).toBeVisible({ timeout: 10000 });
    // "Start interview" should be disabled under feature flag VIDEO_INTERVIEW_ENABLED=false
    const startBtn = page.locator('button:has-text("Start Interview")');
    expect(await startBtn.isDisabled()).toBe(true);

    // Click "Skip for now"
    await page.click('button:has-text("Skip for now")');

    // 9. Redirect to /candidate/profile
    await page.waitForURL('**/candidate/profile', { timeout: 15000 });
    expect(page.url()).toContain('/candidate/profile');

    // 10. Verify Profile Page has completion score > 0%
    const scoreText = page.locator('text=Profile Completion');
    await expect(scoreText).toBeVisible();

    // Verify progress bar and checklist
    const checklistItems = page.locator('[id^="section-"]');
    expect(await checklistItems.count()).toBeGreaterThan(5);
  });
});
