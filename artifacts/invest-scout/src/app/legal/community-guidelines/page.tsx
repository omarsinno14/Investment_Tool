import { LegalLayout } from "@/components/app/LegalLayout";
import { AntiScamNotice } from "@/components/app/AntiScamNotice";

export default function CommunityGuidelinesPage() {
  return (
    <LegalLayout
      title="Community Guidelines"
      intro="Vertica is a private, members-only community for sharing investment information and building professional networks. These guidelines keep the community trustworthy and safe. Violations may result in content removal, suspension, or permanent removal from the platform."
    >
      <section>
        <h2>1. No Scams or Fraud</h2>
        <p>
          Fraudulent schemes have no place on Vertica. Do not post deceptive opportunities, fake track
          records, fabricated documents, Ponzi or pyramid structures, or anything designed to mislead
          members. Claims of guaranteed returns or risk-free investing are prohibited.
        </p>
      </section>

      <section>
        <h2>2. No Solicitation of Off-Platform Fund Transfers</h2>
        <p>
          Vertica never handles, custodies, or moves investment money. Do not ask members to wire funds,
          send crypto, or otherwise transfer money to you, to a third party, or into a deal — on or off
          the platform. Any request to send funds to participate in an opportunity is a major red flag and
          a violation of these guidelines.
        </p>
      </section>

      <section>
        <h2>3. No Impersonation or Misrepresentation</h2>
        <ul>
          <li>Do not impersonate other people, companies, or Vertica staff.</li>
          <li>Do not misstate your identity, credentials, licenses, or affiliations.</li>
          <li>Do not create accounts to evade bans or manipulate discussions.</li>
        </ul>
      </section>

      <section>
        <h2>4. Anti-Fraud Expectations</h2>
        <ul>
          <li>Be honest and accurate in everything you post.</li>
          <li>Include appropriate risk context when discussing opportunities.</li>
          <li>Respect that other members must do their own due diligence.</li>
          <li>Never pressure, rush, or guarantee outcomes to anyone.</li>
        </ul>
      </section>

      <section>
        <h2>5. Respectful Conduct</h2>
        <p>
          Treat members professionally. Harassment, hate speech, threats, spam, and unlawful or infringing
          content are not allowed. Keep discussions constructive and on-topic.
        </p>
      </section>

      <section>
        <h2>6. Privacy and Confidentiality</h2>
        <p>
          Do not share other members' personal or confidential information without consent. Respect the
          private nature of the community.
        </p>
      </section>

      <section>
        <h2>7. Reporting Violations</h2>
        <p>
          If you encounter a scam, a fund-transfer request, impersonation, or any other violation, report
          it using the flag option available on posts, messages, and profiles, or contact us through the
          in-app support channel. Reports go directly to our moderation team. Do not engage further with a
          suspected scammer, and never send funds.
        </p>
      </section>

      <section>
        <h2>8. Enforcement</h2>
        <p>
          We may remove content, restrict features, or suspend or terminate accounts that violate these
          guidelines. Serious or repeated violations, especially fraud or fund solicitation, may be
          reported to the appropriate authorities.
        </p>
      </section>

      <AntiScamNotice />
    </LegalLayout>
  );
}
