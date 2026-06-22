import { LegalLayout } from "@/components/app/LegalLayout";
import { AntiScamNotice } from "@/components/app/AntiScamNotice";

export default function RiskDisclosurePage() {
  return (
    <LegalLayout
      title="Investment Risk Disclosure"
      intro="This disclosure describes important risks associated with investing. Vertica is an information, networking, and advertising platform only. Please read this carefully before acting on any information you find here."
    >
      <section>
        <h2>1. All Investments Carry Risk</h2>
        <p>
          Every investment involves risk, including the <strong>risk of total loss of capital</strong>.
          Past performance is not indicative of future results. The value of investments can fall as well
          as rise, and you may get back less than you invested — or nothing at all. You should never
          invest money you cannot afford to lose.
        </p>
      </section>

      <section>
        <h2>2. Projections Are Not Promises</h2>
        <p>
          Any figures, targets, projected returns, or forward-looking statements presented on Vertica —
          whether by members, advertisers, or third parties — are illustrative estimates only. They are
          <strong> not guarantees, promises, or commitments</strong> of any outcome. No content on this
          platform should be read as assuring a particular return. Vertica does not use, endorse, or
          permit claims of "guaranteed returns" or risk-free investing.
        </p>
      </section>

      <section>
        <h2>3. Vertica Provides Information Only</h2>
        <p>
          Vertica does not provide financial, investment, legal, or tax advice and does not recommend any
          security, product, or strategy. We are not a broker, dealer, or adviser, we do not custody or
          move funds, and we do not facilitate or execute any investment transaction. Listings and
          discussions are informational and are not offers or solicitations.
        </p>
      </section>

      <section>
        <h2>4. Do Your Own Due Diligence</h2>
        <p>
          You are solely responsible for evaluating any opportunity. Independently verify all claims,
          documents, identities, and figures before committing capital. Consider risks such as illiquidity,
          leverage, market volatility, concentration, fraud, and the possibility that an issuer or
          counterparty fails to perform.
        </p>
      </section>

      <section>
        <h2>5. Consult a Licensed Advisor</h2>
        <p>
          Before making any investment decision, consult a licensed financial advisor, attorney, or tax
          professional who can assess your individual circumstances, objectives, and risk tolerance.
          Information on Vertica is general in nature and not tailored to you.
        </p>
      </section>

      <section>
        <h2>6. Third-Party and Member Content</h2>
        <p>
          Opportunities and information are posted by members and advertisers. Vertica does not verify,
          endorse, or guarantee any such content and is not responsible for its accuracy or for any
          decision you make based upon it.
        </p>
      </section>

      <section>
        <h2>7. No Liability for Investment Decisions</h2>
        <p>
          To the maximum extent permitted by law, Vertica accepts no liability for losses arising from any
          investment decision or from reliance on any information available through the platform. You
          assume full responsibility for your own decisions.
        </p>
      </section>

      <AntiScamNotice />
    </LegalLayout>
  );
}
