import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthService } from '../../services/auth.service';
import { Page, ErrorBox, inputClass, buttonClass } from '../../components/platform/OperationsUI';
export function OrganisationInvitation() {
  const [token] = useState(() => {
    const t = window.location.hash.slice(1);
    window.history.replaceState(null, '', window.location.pathname);
    return t;
  });
  const form = useForm<{ firstName: string; lastName: string; password: string }>();
  const [error, setError] = useState<any>(),
    [done, setDone] = useState(false);
  return (
    <div className="min-h-screen bg-canvas text-ink p-6 flex justify-center items-center">
      <div className="max-w-lg w-full">
        <Page
          title="Set up your organization account"
          description="Accept your invitation after the organization has been verified."
        >
          {done ? (
            <p>
              Your account is ready. Your organization team will provide the Organization Portal
              login once it is available.
            </p>
          ) : !token ? (
            <p>
              This invitation link is missing its token. Ask your platform administrator for a new
              link.
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  await AuthService.acceptOrganisationInvitation({ ...values, token });
                  setDone(true);
                } catch (e) {
                  setError(e);
                }
              })}
            >
              {(['firstName', 'lastName', 'password'] as const).map((name) => (
                <label key={name} className="block">
                  {name}
                  <input
                    className={inputClass}
                    type={name === 'password' ? 'password' : 'text'}
                    required
                    minLength={name === 'password' ? 12 : 1}
                    maxLength={name === 'password' ? 72 : 80}
                    {...form.register(name, { required: true })}
                  />
                </label>
              ))}
              {error && <ErrorBox error={error} />}
              <button disabled={form.formState.isSubmitting} className={buttonClass}>
                Accept invitation
              </button>
            </form>
          )}
        </Page>
      </div>
    </div>
  );
}
