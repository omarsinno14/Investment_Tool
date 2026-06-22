import { LegalLayout } from "@/components/app/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro="These Terms of Service govern your access to and use of Vertica, a private, members-only platform for investment information, networking, and advertising. By creating an account or using the platform, you agree to these terms."
    >
      <section>
        <h2>1. What Vertica Is — and Is Not</h2>
        <p>
          Vertica is an information, networking, and advertising platform for its members. We provide
          access to educational content, member discussion, opportunity listings posted by members or
          advertisers, and tools for building your professional network.
        </p>
        <p>
          Vertica is <strong>not</strong> a broker, dealer, investment adviser, exchange, custodian, or
          financial institution. We do <strong>not</strong> custody, hold, transmit, or move investor
          funds; we do <strong>not</strong> facilitate, execute, settle, or guarantee any investment
          transaction; and we do <strong>not</strong> provide financial, legal, tax, or investment
          advice. Nothing on the platform is a solicitation, offer, or recommendation to buy or sell any
          security or financial product.
        </p>
        <p>
          Any payment you make to Vertica relates solely to platform subscriptions, advertising
          placements, or identity verification services. Vertica never accepts or processes money
          intended for an investment.
        </p>
      </section>

      <section>
        <h2>2. Eligibility and Membership</h2>
        <ul>
          <li>You must be at least 18 years old and able to form a binding contract.</li>
          <li>Membership is private and may be subject to approval, verification, or invitation.</li>
          <li>You agree to provide accurate registration information and keep it current.</li>
          <li>You are responsible for all activity that occurs under your account credentials.</li>
        </ul>
      </section>

      <section>
        <h2>3. Acceptable Use</h2>
        <p>You agree not to use Vertica to:</p>
        <ul>
          <li>Solicit or arrange off-platform transfers of investor funds.</li>
          <li>Impersonate any person or entity or misrepresent your affiliation.</li>
          <li>Post fraudulent, misleading, or deceptive opportunities or claims.</li>
          <li>Promise or imply guaranteed returns or risk-free outcomes.</li>
          <li>Distribute spam, malware, or unlawful, harassing, or infringing content.</li>
          <li>Scrape, reverse engineer, or disrupt the platform or its security.</li>
        </ul>
        <p>
          Your conduct is further governed by our Community Guidelines, which are incorporated into
          these terms by reference.
        </p>
      </section>

      <section>
        <h2>4. Member and Third-Party Content</h2>
        <p>
          Content on Vertica — including opportunity listings, comments, profiles, and advertisements —
          is created by members and third parties. Vertica does not verify, endorse, or guarantee the
          accuracy, legality, or suitability of any such content. You are solely responsible for
          conducting your own due diligence before relying on any information.
        </p>
      </section>

      <section>
        <h2>5. Payments and Subscriptions</h2>
        <p>
          Paid features such as subscriptions, advertising, and verification are billed according to the
          plan you select and our Subscription &amp; Billing Terms and Advertiser Terms. All such fees
          are for platform services only and are unrelated to any investment.
        </p>
      </section>

      <section>
        <h2>6. Intellectual Property</h2>
        <p>
          Vertica and its branding, software, and design are owned by Vertica or its licensors. You
          retain ownership of content you submit but grant Vertica a non-exclusive, worldwide license to
          host, display, and distribute it for the purpose of operating the platform.
        </p>
      </section>

      <section>
        <h2>7. Disclaimers</h2>
        <p>
          The platform is provided on an "as is" and "as available" basis without warranties of any
          kind, express or implied. Vertica does not warrant that content is accurate, complete, or
          suitable for any purpose, or that the platform will be uninterrupted or error-free.
        </p>
      </section>

      <section>
        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Vertica is not liable for any investment decision you
          make or for any indirect, incidental, special, or consequential damages arising from your use
          of the platform or reliance on any content. You assume full responsibility for your investment
          decisions.
        </p>
      </section>

      <section>
        <h2>9. Suspension and Termination</h2>
        <p>
          We may suspend or terminate accounts that violate these terms, pose a risk to members, or
          engage in fraud. You may close your account at any time through your settings.
        </p>
      </section>

      <section>
        <h2>10. Changes to These Terms</h2>
        <p>
          We may update these terms from time to time. Material changes will be communicated through the
          platform. Continued use after an update constitutes acceptance of the revised terms.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Questions about these terms can be sent to our team through the in-app support channel.
        </p>
      </section>
    </LegalLayout>
  );
}
