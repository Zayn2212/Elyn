import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div
        className="fixed top-0 left-0 right-0 z-[10000] bg-background/95 backdrop-blur border-b border-border px-4"
        style={{ paddingTop: "var(--safe-top, env(safe-area-inset-top, 40px))" }}
      >
        <div className="flex items-center gap-3 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </div>

      <ScrollArea
        className="h-screen"
        style={{ paddingTop: "calc(57px + var(--safe-top, env(safe-area-inset-top, 40px)))" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8 text-sm leading-relaxed text-foreground/80">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Effective Date: January 1, 2025 &nbsp;·&nbsp; Last Updated: April
              1, 2026
            </p>
            <p>
              Elyn Health Technologies, Inc. ("Elyn", "we", "our", or "us") is
              committed to protecting the privacy of the healthcare
              professionals and organizations that use our platform. This
              Privacy Policy explains how we collect, use, disclose, and
              safeguard information when you use the Elyn application and
              related services (collectively, the "Service").
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              1. Scope
            </h2>
            <p>
              This Policy applies to all users of the Elyn platform, including
              the web application, iOS app, and Android app. It covers:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account Data</strong> — information you provide when
                registering and managing your account
              </li>
              <li>
                <strong>Clinical Data</strong> — patient-related information
                entered or generated within the platform (subject to HIPAA)
              </li>
              <li>
                <strong>Usage Data</strong> — technical logs, analytics, and
                device information
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              2. Information We Collect
            </h2>

            <h3 className="text-sm font-semibold text-foreground/90 mt-3">
              2a. Information You Provide
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Full name, email address, and password at registration</li>
              <li>
                Professional credentials: specialty, NPI number, Tax ID / EIN,
                Taxonomy Code, and billing address
              </li>
              <li>Facility names and affiliated hospital information</li>
              <li>
                Clinical notes, voice recordings, and patient data you input
                while using the Service
              </li>
              <li>
                Payment information (processed via PCI-compliant third-party
                processors; we do not store card numbers)
              </li>
            </ul>

            <h3 className="text-sm font-semibold text-foreground/90 mt-3">
              2b. Information Collected Automatically
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Device identifiers, operating system, and browser or app version
              </li>
              <li>IP address and approximate geographic location</li>
              <li>
                Session activity logs (pages visited, features used, timestamps)
              </li>
              <li>Performance diagnostics and crash reports (de-identified)</li>
            </ul>

            <h3 className="text-sm font-semibold text-foreground/90 mt-3">
              2c. Protected Health Information (PHI)
            </h3>
            <p>
              Clinical notes and patient records entered on the platform may
              constitute PHI under HIPAA. We treat this data under the terms of
              our Business Associate Agreement (BAA) and applicable law. PHI is
              never used to train AI models without prior de-identification in
              compliance with 45 CFR §164.514.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              3. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provision and operate the Elyn platform</li>
              <li>
                Generate AI-assisted clinical notes, coding suggestions, and
                billing recommendations
              </li>
              <li>
                Authenticate users and enforce multi-factor authentication
              </li>
              <li>Process subscription payments and manage billing</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>
                Send product updates, security alerts, and compliance
                notifications (you may opt out of marketing communications)
              </li>
              <li>
                Conduct aggregate, de-identified analytics to improve the
                Service
              </li>
              <li>Comply with legal obligations and enforce our Terms</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              4. Data Sharing & Disclosure
            </h2>
            <p>
              We do not sell your personal information. We may share data in the
              following limited circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Service Providers:</strong> Trusted vendors (cloud
                hosting, payment processors, analytics) who process data on our
                behalf under data processing agreements
              </li>
              <li>
                <strong>Healthcare Payers & Clearinghouses:</strong> When you
                initiate claims submission through the platform, billing data is
                transmitted to the designated payer or clearinghouse
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law,
                subpoena, court order, or to protect the rights and safety of
                Elyn, its users, or the public
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a
                merger, acquisition, or sale of assets, subject to standard
                confidentiality protections
              </li>
            </ul>
            <p>
              PHI is never disclosed to third parties except as permitted by the
              BAA and HIPAA Privacy Rule.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              5. Data Security
            </h2>
            <p>
              We implement industry-leading security measures to protect your
              data:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Encryption at rest:</strong> AES-256 for all stored data
              </li>
              <li>
                <strong>Encryption in transit:</strong> TLS 1.3 for all network
                communications
              </li>
              <li>
                <strong>Infrastructure certification:</strong> SOC 2 Type II
                certified
              </li>
              <li>
                <strong>Access controls:</strong> Role-based access controls
                (RBAC) with principle of least privilege
              </li>
              <li>
                <strong>Multi-factor authentication:</strong> TOTP-based MFA
                available and recommended for all users
              </li>
              <li>
                <strong>Audit logging:</strong> Comprehensive logs of all PHI
                access and administrative actions
              </li>
              <li>
                <strong>Penetration testing:</strong> Annual third-party
                security assessments
              </li>
            </ul>
            <p>
              Despite these measures, no system is 100% secure. You should use
              strong, unique passwords and enable MFA on your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              6. Data Retention
            </h2>
            <p>
              We retain account and clinical data for as long as your account is
              active or as needed to provide the Service. Upon account
              termination:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Account and profile data is deleted within 90 days of
                termination, unless retention is required by law
              </li>
              <li>
                Clinical records may be retained for up to 7 years to satisfy
                medical record retention requirements under applicable state law
              </li>
              <li>
                Aggregate, de-identified analytics data may be retained
                indefinitely
              </li>
            </ul>
            <p>
              You may request export or deletion of your data by contacting us
              at <span className="text-primary">privacy@elyn.ai</span>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              7. Your Rights & Choices
            </h2>
            <p>
              Depending on your jurisdiction, you may have the following rights
              regarding your personal data:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Access:</strong> Request a copy of the data we hold
                about you
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate
                information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and
                associated personal data
              </li>
              <li>
                <strong>Portability:</strong> Request your data in a structured,
                machine-readable format
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from marketing
                communications at any time via the unsubscribe link in any email
              </li>
            </ul>
            <p>
              To exercise these rights, email{" "}
              <span className="text-primary">privacy@elyn.ai</span> with your
              request. We will respond within 30 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              8. Cookies & Tracking
            </h2>
            <p>
              The Elyn web application uses essential session cookies for
              authentication. We do not use third-party advertising cookies or
              cross-site tracking. Our mobile apps use local device storage for
              session tokens only.
            </p>
          </section>

          {/* <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              9. Children's Privacy
            </h2>
            <p>
              The Service is intended for licensed healthcare professionals aged
              18 and older. We do not knowingly collect personal information from
              individuals under 18. If you believe we have inadvertently collected
              such information, contact us immediately at{" "}
              <span className="text-primary">privacy@elyn.ai</span>.
            </p>
          </section> */}

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              9. International Data Transfers
            </h2>
            <p>
              Elyn is operated from the United States. If you access the Service
              from outside the United States, your data will be transferred to
              and processed in the U.S. under the protections described in this
              Policy. For users in the European Economic Area, we rely on
              Standard Contractual Clauses as a transfer mechanism.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy periodically. Material changes
              will be communicated via email or in-app notification at least 14
              days before they take effect. The "Last Updated" date at the top
              of this page reflects the most recent revision.
            </p>
          </section>

          {/* <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              11. Contact Us
            </h2>
            <p>
              For privacy-related questions or to exercise your rights, contact
              our Privacy Officer at:
            </p>
            <p className="text-foreground/60">
              Elyn Health Technologies, Inc.
              <br />
              Privacy Officer
              <br />
              1234 Innovation Drive, Suite 500
              <br />
              Wilmington, DE 19801
              <br />
              <span className="text-primary">privacy@elyn.ai</span>
            </p>
          </section> */}

          <div className="pt-4 pb-8 border-t border-border text-xs text-muted-foreground">
            © 2026 Elyn Health Technologies, Inc. All rights reserved.
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PrivacyPolicy;
