import type { V2_MetaFunction } from "@remix-run/react/dist/routeModules";
import { Spacer } from "~/components/Spacer";

export const meta: V2_MetaFunction = ({ matches }) => {
  let rootModule = matches.find((match) => match.id === "root");
  return [...(rootModule?.meta ?? []), { title: "Privacy policy - Budgetsco" }];
};

export default function PrivacyPolicy() {
  return (
    <>
      <main className="pb-28">
        <h1 className="text-3xl text-center pb-5">Privacy policy</h1>
        <h3 className="text-sm text-center">Last updated: January 7, 2022</h3>
        <div className="flex flex-col items-center p-4">
          <div className="flex justify-center w-full md:w-3/4">
            <div>
              <p>
                This privacy policy explains how Budgetsco collects, uses and transfers
                your information.
              </p>
              <br />
              <h3 className="text-xl font-semibold">What do we collect?</h3>
              <Spacer size={1} />
              <ul className="list-disc list-inside md:list-outside space-y-2">
                <li>
                  When you visit our website/app, we collect some basic information that
                  most websites collect. This includes the your browser type, language
                  preference and the date and time of each request. We also collect
                  potentially personally-identifying information like Internet Protocol
                  (IP) addresses.
                </li>
                <li>
                  When you create an account on Budgetsco, we store your email-id as well.
                  We use this email-id to communicate with you.
                </li>
                <li>
                  The transactions your create on Budgetsco are neither verified nor
                  linked to any bank statement. So, it's up to you how much personal data
                  you enter in a transaction, especially in the description section.
                  <Spacer size={1} />
                  And even though we store the description of the transactions, it is only
                  for your convenience and is not used by us in any way.
                </li>
                <li>
                  We do not store any payment details when you pay for subscription. All
                  the payment data is handled by Google Play Store or Stripe (depending on
                  the OS and browser used while paying).
                </li>
              </ul>
              <br />
              <h3 className="text-xl font-semibold">What we do not collect</h3>
              <Spacer size={1} />
              <p>
                We do not intentionally collect{" "}
                <strong>sensitive personal information</strong>, such as social security
                numbers, genetic data, health information, or religious information.
                Although Budgetsco does not request or intentionally collect any sensitive
                personal information, we realize that you might store this kind of
                information in your account, especially in the description section of
                transactions you create. If you store any sensitive personal information
                on our servers, you are consenting to our storage of that information on
                our servers.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Why do we collect this data?</h3>
              <Spacer size={1} />
              <ul className="list-disc list-inside md:list-outside space-y-2">
                <li>
                  We require creating an account with an email-id to prevent abuse of our
                  system.
                </li>
                <li>
                  We use your data only for providing you insights on your expenses and
                  recommendations on improving your budget.
                </li>
                <li>
                  We may use aggregated, non-personally identifying information to
                  operate, improve, and optimize our website/app and service.
                </li>
              </ul>
              <br />
              <h3 className="text-xl font-semibold">
                How we share the data we collect?
              </h3>{" "}
              <Spacer size={1} />
              <ul className="list-disc list-inside md:list-outside space-y-2">
                <li>
                  We do not share, sell, rent, or trade "User Personal Information" (any
                  data about one of our users which could, alone or together with other
                  data, personally identify them) with third parties for their commercial
                  purposes.
                </li>
                <li>
                  We do not disclose User Personal Information outside Budgetsco, except
                  in the situations listed in this section or in the section below on
                  Compelled Disclosure.
                </li>
              </ul>
              <br />
              <h3 className="text-xl font-semibold">Cookie policy</h3> <Spacer size={1} />
              <p>
                Budgetsco uses cookies to make interactions with our service easy and
                meaningful. We use cookies (and similar technologies, like localStorage,
                indexedDB) to keep you logged in, remember your preferences, and provide
                necessary functionalities.
              </p>
              <br />
              <p>
                A cookie is a small piece of text that our web server stores on your
                computer or mobile device, which your browser sends to us when you return
                to our site. Cookies do not necessarily identify you if you are merely
                visiting Budgetsco; however, a cookie may store a unique identifier for
                each logged in user. The cookies we set are essential for the operation of
                the website/app, or are used for performance or functionality. By using
                our website/app, you agree that we can place these types of cookies on
                your computer or device. If you disable or block cookies, you will not be
                able to log in or use our services.
              </p>
              <br />
              <h3 className="text-xl font-semibold">How we secure your data</h3>
              <Spacer size={1} />
              <p>
                We take all measures reasonably necessary to protect your data stored with
                us from unauthorized access, alteration, or destruction and maintain data
                accuracy. We follow generally accepted industry standards to protect the
                personal information submitted to us, both during transmission and once we
                receive it.
              </p>
              <p>
                No method of transmission, or method of electronic storage, is 100%
                secure. Therefore, we cannot guarantee its absolute security.
              </p>
              <br />
              <h3 className="text-xl font-semibold">
                How you can access and control the data we collect
              </h3>
              <Spacer size={1} />
              <p>
                If you're already a Budgetsco user, you may access, update, alter, or
                delete your data from our website/app or by contacting{" "}
                <a
                  className="underline hover:text-accent"
                  href="mailto:support@budgetsco.online"
                >
                  support@budgetsco.online
                </a>
              </p>
              <br />
              <h3 className="text-xl font-semibold">Data retention and deletion</h3>
              <Spacer size={1} />
              <p>
                We do not automatically delete inactive user accounts, so unless you
                choose to delete your account, we will retain your account data
                indefinitely.
              </p>
              <Spacer size={1} />
              <p>
                If you would like to cancel your account or delete your data, you may do
                so by emailing{" "}
                <a
                  className="underline hover:text-accent"
                  href="mailto:support@budgetsco.online"
                >
                  support@budgetsco.online
                </a>
                . We will retain and use your data as necessary to comply with our legal
                obligations, resolve disputes, and enforce our agreements, but barring
                legal requirements, we will delete your full profile (within reason)
                within 30 days.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Changes to our privacy policy</h3>
              <Spacer size={1} />
              <p>
                Although most changes are likely to be minor, we may change our Privacy
                policy from time to time. We will provide notification of material changes
                to this Privacy policy at least 30 days prior to the change taking effect
                by posting a notice on our home page or sending email to the email address
                specified in your Budgetsco account. For changes to this Privacy policy
                that do not affect your rights, we encourage visitors to check this page
                frequently.
              </p>
              <br />
              <h3 className="text-xl font-semibold">Contacting Budgetsco</h3>
              <Spacer size={1} />
              <p>
                Questions regarding our Privacy policy or information practices should be
                directed to{" "}
                <a
                  className="underline hover:text-accent"
                  href="mailto:support@budgetsco.online"
                >
                  support@budgetsco.online
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
