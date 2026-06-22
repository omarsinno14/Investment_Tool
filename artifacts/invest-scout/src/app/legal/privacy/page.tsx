import { LegalLayout } from "@/components/app/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="This Privacy Policy explains what information Vertica collects, how we use it, and the choices you have. We are committed to handling your data responsibly and only for the purpose of operating a private, members-only information and networking platform."
    >
      <section>
        <h2>1. Information We Collect</h2>
        <h3>Information you provide</h3>
        <ul>
          <li>Account details such as name, email, password, and profile information.</li>
          <li>Verification information, including identity documents you choose to submit.</li>
          <li>Content you post, including messages, comments, listings, and interests.</li>
          <li>Billing details for subscriptions, advertising, or verification (processed by our payment providers).</li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>Device, browser, and log data such as IP address and access times.</li>
          <li>Usage data describing how you interact with the platform.</li>
          <li>Cookies and similar technologies used to keep you signed in and improve the service.</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Information</h2>
        <ul>
          <li>To operate, maintain, and secure the platform.</li>
          <li>To authenticate members and provide verification badges.</li>
          <li>To deliver relevant content, opportunities, and advertising.</li>
          <li>To process subscription, advertising, and verification payments.</li>
          <li>To detect and prevent fraud, abuse, and scam activity.</li>
          <li>To communicate with you about your account and the service.</li>
        </ul>
        <p>
          Vertica does not custody or move investment funds, so we do not collect or store investment
          account credentials or facilitate money transfers between members.
        </p>
      </section>

      <section>
        <h2>3. How We Share Information</h2>
        <p>We may share information with:</p>
        <ul>
          <li>Service providers who help operate the platform (hosting, analytics, payment processing).</li>
          <li>Other members, limited to the profile and content you choose to make visible.</li>
          <li>Authorities when required by law or to investigate fraud or safety issues.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section>
        <h2>4. Cookies and Tracking</h2>
        <p>
          We use cookies to keep you signed in, remember preferences, and understand usage. You can
          control cookies through your browser settings, though some features may not function without
          them.
        </p>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <p>
          We retain personal information for as long as your account is active or as needed to provide the
          service, comply with legal obligations, resolve disputes, and enforce our agreements.
        </p>
      </section>

      <section>
        <h2>6. Your Rights and Choices</h2>
        <ul>
          <li>Access, update, or correct your profile information in your settings.</li>
          <li>Request deletion of your account and associated personal data.</li>
          <li>Opt out of non-essential communications.</li>
          <li>Depending on your location, exercise additional rights under applicable data laws.</li>
        </ul>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We use technical and organizational measures to protect your information. No system is fully
          secure, so we cannot guarantee absolute security and encourage you to use a strong, unique
          password.
        </p>
      </section>

      <section>
        <h2>8. International Transfers</h2>
        <p>
          Your information may be processed in countries other than your own. Where required, we use
          appropriate safeguards for such transfers.
        </p>
      </section>

      <section>
        <h2>9. Children's Privacy</h2>
        <p>
          Vertica is intended for adults aged 18 and over. We do not knowingly collect information from
          children.
        </p>
      </section>

      <section>
        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be communicated through the
          platform.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>For privacy questions or requests, contact us through the in-app support channel.</p>
      </section>
    </LegalLayout>
  );
}
