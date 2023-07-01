import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Terms of service - Budgetsco" }];
};

export default function PrivacyPolicy() {
  return (
    <>
      <main className="pb-28">
        <h1 className="text-3xl text-center pb-5">Terms of service</h1>
        <h3 className="text-sm text-center">Last updated: January 7, 2022</h3>
        <div className="flex flex-col items-center p-4">
          <div className="flex justify-center w-full md:w-3/4">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Overview</h3>
              <p>
                This app is operated by Budgetsco. Throughout the site, the terms “we”,
                “us” and “our” refer to Budgetsco. Budgetsco offers this app, including
                all information, tools and services available from this site to you, the
                user, conditioned upon your acceptance of all terms, conditions, policies
                and notices stated here.{" "}
              </p>
              <p>
                By visiting our site or using our app, you engage in our “Service” and
                agree to be bound by the following terms and conditions (“Terms of
                Service”, “Terms”), including those additional terms and conditions and
                policies referenced herein and/or available by hyperlink. These Terms of
                Service apply to all users of the site, including without limitation users
                who are browsers, customers, and/ or contributors of content.
              </p>
              <p>
                Please read these Terms of Service carefully before accessing or using our
                app. By accessing or using any part of the site, you agree to be bound by
                these Terms of Service. If you do not agree to all the terms and
                conditions of this agreement, then you may not access the app or use any
                services.
              </p>
              <p>
                Any new features or tools which are added to the current store shall also
                be subject to the Terms of Service. You can review the most current
                version of the Terms of Service at any time on this page. We reserve the
                right to update, change or replace any part of these Terms of Service by
                posting updates and/or changes to our app. It is your responsibility to
                check this page periodically for changes. Your continued use of or access
                to the app following the posting of any changes constitutes acceptance of
                those changes.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 1 - General Conditions</h3>
              <p>
                We reserve the right to refuse service to anyone for any reason at any
                time.
              </p>
              <p>
                You may not use our products for any illegal or unauthorized purpose nor
                may you, in the use of the Service, violate any laws in your jurisdiction
                (including but not limited to copyright laws).
              </p>
              <p>
                You must not transmit any worms or viruses or any code of a destructive
                nature.
              </p>
              <p>
                A breach or violation of any of the Terms will result in an immediate
                termination of your Services.
              </p>
              <p>
                You agree not to reproduce, duplicate, copy, sell, resell or exploit any
                portion of the Service, use of the Service, or access to the Service or
                any contact on the app through which the service is provided, without
                express written permission by us.
              </p>
              <p>
                The headings used in this agreement are included for convenience only and
                will not limit or otherwise affect these Terms.
              </p>
              <br />
              <h3 className="text-xl font-semibold">
                Section 2 - Accuracy, completeness and timeliness of information
              </h3>
              <p>
                We are not responsible if information made available on this site is not
                accurate, complete or current. The material on this site is provided for
                general information only and should not be relied upon or used as the sole
                basis for making decisions without consulting primary, more accurate, more
                complete or more timely sources of information. Any reliance on the
                material on this site is at your own risk.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 3 - This party links</h3>
              <p>
                Certain content, products and services available via our Service may
                include materials from third-parties.
              </p>
              <p>
                Third-party links on this site may direct you to third-party websites that
                are not affiliated with us. We are not responsible for examining or
                evaluating the content or accuracy and we do not warrant and will not have
                any liability or responsibility for any third-party materials or websites,
                or for any other materials, products, or services of third-parties.
              </p>
              <p>
                We are not liable for any harm or damages related to the purchase or use
                of goods, services, resources, content, or any other transactions made in
                connection with any third-party websites. Please review carefully the
                third-party's policies and practices and make sure you understand them
                before you engage in any transaction. Complaints, claims, concerns, or
                questions regarding third-party products should be directed to the
                third-party.
              </p>
              <br />
              <h3 className="text-xl font-semibold">
                Section 4 - User generated transactions and other submissions
              </h3>
              <p>
                You agree that your transactions will not violate any right of any
                third-party, including copyright, trademark, privacy, personality or other
                personal or proprietary right. You further agree that your transactions
                will not contain libelous or otherwise unlawful, abusive or obscene
                material, or contain any computer virus or other malware that could in any
                way affect the operation of the Service or any related app. You may not
                pretend to be someone other than yourself, or otherwise mislead us or
                third-parties as to the origin of any transaction. You are solely
                responsible for any transaction you create and their accuracy. We take no
                responsibility and assume no liability for any transaction posted by you
                or any third-party.
              </p>
              <p>
                We may, but have no obligation to, monitor, edit or remove content that we
                determine in our sole discretion are unlawful, offensive, threatening,
                libelous, defamatory, pornographic, obscene or otherwise objectionable or
                violates intellectual property of any party or these Terms of Service.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 5 - Personal information</h3>
              <p>
                Your submission of personal information through our app is governed by our{" "}
                <a className="underline hover:text-accent" href="/privacyPolicy">
                  privacy policy
                </a>
                .
              </p>
              <br />
              <h3 className="text-xl font-semibold">
                Section 6 - Errors, Inaccuracies and omissions
              </h3>
              <p>
                Occasionally there may be information on our site or in the Service that
                contains typographical errors, inaccuracies or omissions. We reserve the
                right to correct any errors, inaccuracies or omissions, and to change or
                update information if any information in the Service or on any related app
                is inaccurate at any time without prior notice.
              </p>
              <p>
                We undertake no obligation to update, amend or clarify information in the
                Service or on any related app, except as required by law. No specified
                update or refresh date applied in the Service or on any related app,
                should be taken to indicate that all information in the Service or on any
                related app has been modified or updated.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 7 - Prohibited uses</h3>
              <p>
                In addition to other prohibitions as set forth in the Terms of Service,
                you are prohibited from using the site or its content:
              </p>
              <ul className="list-disc list-inside md:list-inside">
                <li>for any unlawful purpose;</li>
                <li>to solicit others to perform or participate in any unlawful acts;</li>
                <li>
                  to violate any international, federal, provincial or state regulations,
                  rules, laws, or local ordinances;
                </li>
                <li>
                  to infringe upon or violate our intellectual property rights or the
                  intellectual property rights of others;
                </li>
                <li>
                  to harass, abuse, insult, harm, defame, slander, disparage, intimidate,
                  or discriminate based on gender, sexual orientation, religion,
                  ethnicity, race, age, national origin, or disability;
                </li>
                <li>to submit false or misleading information;</li>
                <li>
                  to upload or transmit viruses or any other type of malicious code that
                  will or may be used in any way that will affect the functionality or
                  operation of the Service or of any related app, other websites, or the
                  Internet;
                </li>
                <li>to collect or track the personal information of others;</li>
                <li>to spam, phish, pharm, pretext, spider, crawl, or scrape;</li>
                <li>for any obscene or immoral purpose;</li>
                <li>
                  to interfere with or circumvent the security features of the Service or
                  any related app, other websites, or the Internet.
                </li>
              </ul>
              <p>
                We reserve the right to terminate your use of the Service or any related
                app for violating any of the prohibited uses.
              </p>
              <br />
              <h3 className="text-xl font-semibold">
                Section 8 - Disclaimer of warranties; limitation of liability
              </h3>
              <p>
                We do not guarantee, represent or warrant that your use of our service
                will be uninterrupted, timely, secure or error-free.
              </p>
              <p>
                We do not warrant that the results that may be obtained from the use of
                the service will be accurate or reliable.
              </p>
              <p>
                You agree that from time to time we may remove the service for indefinite
                periods of time or cancel the service at any time, without notice to you.
              </p>
              <p>
                You expressly agree that your use of, or inability to use, the service is
                at your sole risk. The service is provided 'as is' and 'as available' for
                your use, without any representation, warranties or conditions of any
                kind, either express or implied.
              </p>
              <p>
                You expressly agree that your use of, or inability to use, the service is
                at your sole risk. The service is provided 'as is' and 'as available' for
                your use, without any representation, warranties or conditions of any
                kind, either express or implied.
              </p>
              <p>
                In no case shall Budgetsco, or our subsidiaries, affiliates, partners,
                service providers, subcontractors, suppliers, interns and employees, be
                liable for any injury, loss, claim, or any direct, indirect, incidental,
                punitive, special, or consequential damages of any kind, including,
                without limitation lost profits, lost revenue, lost savings, loss of data,
                replacement costs, or any similar damages, whether based in contract, tort
                (including negligence), strict liability or otherwise, arising from your
                use of any of the service or for any other claim related in any way to
                your use of the service, including, but not limited to, any errors or
                omissions in any content, or any loss or damage of any kind incurred as a
                result of the use of the service, even if advised of their possibility.
                Because some states or jurisdictions do not allow the exclusion or the
                limitation of liability for consequential or incidental damages, in such
                states or jurisdictions, our liability shall be limited to the maximum
                extent permitted by law.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 9 - Indemnification</h3>
              <p>
                You agree to indemnify, defend and hold harmless Pollscape and our
                subsidiaries, affiliates, partners, service providers, subcontractors,
                suppliers, interns and employees, harmless from any claim or demand,
                including reasonable attorneys’ fees, made by any third-party due to or
                arising out of your breach of these Terms of Service or the documents they
                incorporate by reference, or your violation of any law or the rights of a
                third-party.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 10 - Severability</h3>
              <p>
                In the event that any provision of these Terms of Service is determined to
                be unlawful, void or unenforceable, such provision shall nonetheless be
                enforceable to the fullest extent permitted by applicable law, and the
                unenforceable portion shall be deemed to be severed from these Terms of
                Service, such determination shall not affect the validity and
                enforceability of any other remaining provisions.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 11 - Termination</h3>
              <p>
                The obligations and liabilities of the parties incurred prior to the
                termination date shall survive the termination of this agreement for all
                purposes.
              </p>
              <p>
                These Terms of Service are effective unless and until terminated by either
                you or us. You may terminate these Terms of Service at any time by
                deleting your account.
              </p>
              <p>
                If in our sole judgment you fail, or we suspect that you have failed, to
                comply with any term or provision of these Terms of Service, we also may
                terminate this agreement at any time without notice and accordingly may
                deny you access to our Services (or any part thereof).
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 12 - Entire agreement</h3>
              <p>
                The failure of us to exercise or enforce any right or provision of these
                Terms of Service shall not constitute a waiver of such right or provision.
              </p>
              <p>
                These Terms of Service and any policies or operating rules posted by us on
                this site or in respect to The Service constitutes the entire agreement
                and understanding between you and us and govern your use of the Service,
                superseding any prior or contemporaneous agreements, communications and
                proposals, whether oral or written, between you and us (including, but not
                limited to, any prior versions of the Terms of Service).
              </p>
              <p>
                Any ambiguities in the interpretation of these Terms of Service shall not
                be construed against the drafting party.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 13 - Governing law</h3>
              <p>
                These Terms of Service and any separate agreements whereby we provide you
                Services shall be governed by and construed in accordance with the laws of
                Maharashtra, India.
              </p>
              <br />
              <h3 className="text-xl font-semibold">
                Section 14 - Changes to terms of service
              </h3>
              <p>
                You can review the most current version of the Terms of Service at any
                time at this page.
              </p>
              <p>
                We reserve the right, at our sole discretion, to update, change or replace
                any part of these Terms of Service by posting updates and changes to our
                app. It is your responsibility to check our app periodically for changes.
                Your continued use of or access to our app or the Service following the
                posting of any changes to these Terms of Service constitutes acceptance of
                those changes.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Section 15 - Contact information</h3>
              <p>
                Questions about the Terms of Service should be sent to us at{" "}
                <a
                  className="underline hover:text-accent"
                  href="mailto:budgetsco+support@gmail.com"
                >
                  budgetsco+support@gmail.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
