import { LegalLayout } from "@/components/app/LegalLayout";

export default function AdvertiserTermsPage() {
  return (
    <LegalLayout
      title="Advertiser & Sponsored Content Terms"
      intro="These terms apply to advertisers and members who purchase advertising placements or post sponsored content on Vertica. They supplement our Terms of Service. By submitting an advertisement, you agree to these terms."
    >
      <section>
        <h2>1. Nature of Advertising on Vertica</h2>
        <p>
          Vertica sells advertising and sponsored placements that present information to members. Payment
          to Vertica is solely for advertising visibility — it is never an investment, never a transfer of
          investor funds, and never a fee processed by Vertica on behalf of any deal. Vertica does not
          custody funds or facilitate investment transactions of any kind.
        </p>
      </section>

      <section>
        <h2>2. Content Standards</h2>
        <p>Advertisements and sponsored content must:</p>
        <ul>
          <li>Be truthful, accurate, and not misleading.</li>
          <li>Clearly identify the advertiser and the nature of the offering.</li>
          <li>Include appropriate risk language where investments are referenced.</li>
          <li>Comply with all applicable laws, regulations, and disclosure requirements.</li>
        </ul>
        <p>Advertisements and sponsored content must not:</p>
        <ul>
          <li>Promise, guarantee, or imply guaranteed returns or risk-free outcomes.</li>
          <li>Solicit off-platform transfers of investor funds.</li>
          <li>Misrepresent identity, track record, credentials, or regulatory status.</li>
          <li>Target minors or vulnerable individuals.</li>
          <li>Contain fraudulent, deceptive, or unlawful claims.</li>
        </ul>
      </section>

      <section>
        <h2>3. Disclosure and Labeling</h2>
        <p>
          Sponsored content may be labeled as advertising or sponsored. Advertisers are responsible for
          including any disclosures required by applicable financial promotion and advertising rules in
          their jurisdiction.
        </p>
      </section>

      <section>
        <h2>4. Review and Removal</h2>
        <p>
          Vertica may review, reject, or remove any advertisement at its discretion, including content
          that violates these terms, our Community Guidelines, or applicable law. Approval of an
          advertisement does not constitute endorsement or verification of its claims.
        </p>
      </section>

      <section>
        <h2>5. Advertiser Responsibilities and Warranties</h2>
        <p>
          You warrant that you have the rights to all content you submit, that it is accurate and lawful,
          and that you hold any licenses or registrations required to promote your offering. You agree to
          indemnify Vertica against claims arising from your advertisements.
        </p>
      </section>

      <section>
        <h2>6. Fees and Payment</h2>
        <p>
          Advertising fees are charged according to the placement, duration, or campaign you select. Fees
          are for advertising services only. Billing for recurring placements follows our Subscription
          &amp; Billing Terms where applicable.
        </p>
      </section>

      <section>
        <h2>7. No Endorsement; No Liability</h2>
        <p>
          Vertica does not endorse advertised opportunities and is not a party to any transaction between
          an advertiser and a member. Members must conduct their own due diligence. Vertica is not liable
          for any decision made based on advertising or sponsored content.
        </p>
      </section>

      <section>
        <h2>8. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of advertising services after an
          update constitutes acceptance of the revised terms.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>For advertising inquiries, contact us through the in-app support channel.</p>
      </section>
    </LegalLayout>
  );
}
