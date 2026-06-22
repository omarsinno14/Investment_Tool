import { LegalLayout } from "@/components/app/LegalLayout";

export default function SubscriptionTermsPage() {
  return (
    <LegalLayout
      title="Subscription & Billing Terms"
      intro="These terms govern paid memberships and other recurring charges on Vertica. They supplement our Terms of Service. By starting a paid subscription, you agree to these terms."
    >
      <section>
        <h2>1. What You Are Paying For</h2>
        <p>
          Subscriptions provide access to platform features, content, and networking tools. Fees are for
          platform services only. Vertica does not custody or move investment funds, and no part of your
          subscription is an investment or a payment toward any opportunity.
        </p>
      </section>

      <section>
        <h2>2. Recurring Billing</h2>
        <ul>
          <li>Paid plans renew automatically at the end of each billing period (for example monthly or annually).</li>
          <li>You authorize Vertica and its payment processor to charge your payment method on each renewal until you cancel.</li>
          <li>Renewal is at the then-current price for your plan; we will notify you of material price changes in advance.</li>
          <li>Applicable taxes may be added to the listed price.</li>
        </ul>
      </section>

      <section>
        <h2>3. Cancellation</h2>
        <ul>
          <li>You may cancel at any time from your account settings.</li>
          <li>Cancellation stops future renewals; your access continues until the end of the current paid period.</li>
          <li>Unless required by law, canceling does not retroactively refund the current period.</li>
        </ul>
      </section>

      <section>
        <h2>4. Refunds</h2>
        <p>
          <em>Refund policy placeholder.</em> Except where required by applicable law, subscription fees
          are generally non-refundable. Specific refund eligibility, any trial or money-back windows, and
          the process for requesting a refund will be detailed here and communicated at checkout. Contact
          support if you believe you were charged in error.
        </p>
      </section>

      <section>
        <h2>5. Free Trials and Promotions</h2>
        <p>
          If a free trial or promotional rate is offered, the terms and duration will be disclosed at
          sign-up. Unless you cancel before the trial ends, your plan will convert to a paid subscription
          and the standard fee will apply.
        </p>
      </section>

      <section>
        <h2>6. Payment Methods and Failed Payments</h2>
        <p>
          You must keep a valid payment method on file. If a charge fails, we may retry, suspend access, or
          downgrade your account until payment is resolved. You remain responsible for amounts due.
        </p>
      </section>

      <section>
        <h2>7. Price Changes</h2>
        <p>
          We may change subscription prices. Changes apply to billing periods beginning after we provide
          notice. Continuing your subscription after a change takes effect constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>8. Other Paid Services</h2>
        <p>
          Advertising and verification are billed separately and may be governed by additional terms,
          including our Advertiser &amp; Sponsored Content Terms. These charges, like subscriptions, are
          for platform services only.
        </p>
      </section>

      <section>
        <h2>9. Changes to These Terms</h2>
        <p>
          We may update these billing terms from time to time. Material changes will be communicated
          through the platform.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>For billing questions, contact us through the in-app support channel.</p>
      </section>
    </LegalLayout>
  );
}
