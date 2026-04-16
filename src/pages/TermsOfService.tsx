import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsOfService = () => {
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
          <h1 className="text-lg font-semibold">Terms of Service</h1>
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
              These Terms of Service ("Terms") govern your access to and use of
              Elyn™ ("Elyn", "we", "our", or "us"), a clinical AI assistant
              platform operated by Elyn Health Technologies, Inc. By creating an
              account or using any part of our services, you agree to be bound
              by these Terms.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              1. Description of Service
            </h2>
            <p>
              Elyn is an AI-powered clinical documentation and medical billing
              platform designed exclusively for licensed healthcare
              professionals ("Providers"). The platform assists Providers with:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Automated generation of clinical notes (SOAP, APSO, Brief, and
                custom formats) from voice recordings and structured input
              </li>
              <li>
                Medical coding support including ICD-10 and CPT code suggestions
              </li>
              <li>
                Claims preparation, submission workflow, and billing analytics
              </li>
              <li>Patient census and rounding management</li>
              <li>
                Multi-facility practice management and administrative tools
              </li>
            </ul>
            <p>
              Elyn is a documentation and workflow tool. It does not provide
              medical advice, diagnoses, or treatment recommendations. All
              clinical decisions remain the sole responsibility of the
              supervising Provider.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              2. Eligibility & Account Registration
            </h2>
            <p>
              You must be a licensed healthcare professional (physician, nurse
              practitioner, physician assistant, or other credentialed
              clinician) or an authorized administrative staff member acting on
              behalf of a licensed Provider to use Elyn.
            </p>
            <p>
              By registering, you represent that: (a) all information you
              provide is accurate and current; (b) you have the authority to
              enter into these Terms on behalf of yourself or your practice
              entity; and (c) your use will comply with all applicable laws,
              including HIPAA, HITECH, and state medical practice acts.
            </p>
            <p>
              You are responsible for maintaining the confidentiality of your
              credentials and for all activity that occurs under your account.
              Notify us immediately at{" "}
              <span className="text-primary">security@elyn.ai</span> if you
              suspect unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              3. HIPAA Compliance & Protected Health Information
            </h2>
            <p>
              Elyn operates as a HIPAA-covered Business Associate. We enter into
              a Business Associate Agreement ("BAA") with each Covered Entity
              customer. Our platform is designed with the following safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>AES-256 encryption for data at rest</li>
              <li>TLS 1.3 for all data in transit</li>
              <li>SOC 2 Type II certified infrastructure</li>
              <li>Audit logging of all PHI access events</li>
              <li>Automatic PHI de-identification for AI model training</li>
              <li>Role-based access controls (RBAC)</li>
            </ul>
            <p>
              You agree not to input PHI into any free-text field that is not
              designated for clinical documentation. You are responsible for
              ensuring that your use of Elyn complies with your own HIPAA
              obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Use Elyn to generate fraudulent, fictitious, or misleading
                clinical documentation or billing claims
              </li>
              <li>
                Attempt to reverse-engineer, decompile, or extract any AI models
                or proprietary algorithms
              </li>
              <li>
                Share your login credentials with unauthorized third parties
              </li>
              <li>
                Use the platform in any manner that violates federal or state
                anti-fraud statutes, including the False Claims Act
              </li>
              <li>
                Upload or process PHI for any purpose outside of legitimate
                clinical documentation and billing
              </li>
              <li>
                Use automated scripts or bots to access the service without
                written authorization
              </li>
            </ul>
            <p>
              Elyn reserves the right to suspend or terminate accounts that
              violate this section without prior notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              5. AI-Generated Content & Clinical Responsibility
            </h2>
            <p>
              All AI-generated clinical notes, code suggestions, and billing
              recommendations are tools to assist—not replace—the professional
              judgment of a licensed Provider. You must review, verify, and take
              full responsibility for any documentation submitted to payers,
              patients, or other healthcare entities.
            </p>
            <p>
              Elyn makes no warranty that AI-generated content is accurate,
              complete, or appropriate for any specific clinical situation.
              Incorrect coding or documentation is the sole responsibility of
              the Provider who reviews and signs off on the record.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              6. Subscription, Billing & Cancellation
            </h2>
            <p>
              Elyn is offered on a subscription basis. By activating a paid
              plan, you authorize recurring charges to your designated payment
              method. Subscriptions renew automatically unless cancelled at
              least 48 hours before the renewal date via your account settings.
            </p>
            <p>
              Refunds are evaluated case-by-case and are not guaranteed. Upon
              cancellation, your access continues until the end of the current
              billing period. We reserve the right to modify pricing with 30
              days' written notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              7. Intellectual Property
            </h2>
            <p>
              All software, AI models, user interface elements, trademarks, and
              content comprising the Elyn platform are owned by or licensed to
              Elyn Health Technologies, Inc. These Terms do not grant you any
              intellectual property rights beyond a limited, non-exclusive,
              non-transferable license to use the service as described herein.
            </p>
            <p>
              Clinical notes and records you create using Elyn remain your
              property (or that of your covered entity). By using the service,
              you grant Elyn a limited license to process this data solely to
              deliver the service, subject to the BAA.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              8. Disclaimer of Warranties
            </h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
              LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, OR NON-INFRINGEMENT. ELYN DOES NOT WARRANT THAT THE
              SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR
              OTHER HARMFUL COMPONENTS.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              9. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, ELYN'S TOTAL LIABILITY TO
              YOU FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE
              SERVICE SHALL NOT EXCEED THE AMOUNTS YOU PAID TO ELYN IN THE 12
              MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL ELYN BE LIABLE FOR
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              10. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Elyn Health Technologies,
              Inc. and its officers, directors, employees, and agents from any
              claims, damages, liabilities, and expenses (including attorney
              fees) arising from: (a) your use of the service; (b) your
              violation of these Terms; (c) any PHI breach caused by your
              actions or omissions; or (d) false or fraudulent claims submitted
              using our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              11. Governing Law & Disputes
            </h2>
            <p>
              These Terms are governed by the laws of the State of Delaware,
              without regard to conflict-of-law principles. Any dispute that
              cannot be resolved informally shall be submitted to binding
              arbitration under the rules of the American Arbitration
              Association in Wilmington, Delaware.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              12. Changes to These Terms
            </h2>
            <p>
              We may update these Terms at any time. Material changes will be
              communicated via email or an in-app notice at least 14 days before
              taking effect. Continued use of the service after the effective
              date constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              13. Contact
            </h2>
            <p>
              Questions about these Terms? Contact our legal team at{" "}
              <span className="text-primary">legal@elyn.ai</span> or write to:
            </p>
            <p className="text-foreground/60">
              Elyn Health Technologies, Inc.
              <br />
              Legal Department
              <br />
              1234 Innovation Drive, Suite 500
              <br />
              Wilmington, DE 19801
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

export default TermsOfService;
