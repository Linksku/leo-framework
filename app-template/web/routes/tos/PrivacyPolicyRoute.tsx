/* eslint-disable react/jsx-one-expression-per-line */
import RouteInner from 'core/frame/RouteInner';
import SupportEmail from 'components/SupportEmail';
import { APP_NAME } from 'config';
import { HOME_URL, DOMAIN_NAME } from 'consts/server';

import styles from './PrivacyPolicyRoute.scss';

export default function PrivacyPolicyRoute() {
  return (
    <RouteInner
      title="Privacy Policy"
      className={styles.container}
    >
      <p>Thank you for choosing to be part of our community at {APP_NAME} (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice or our practices with regard to your personal information, please contact us at{' '}{SupportEmail}.</p>

      <p>This privacy notice describes how we might use your information if you:</p>
      <ul>
        <li>Visit our website at{' '}<Link href={HOME_URL}>{DOMAIN_NAME}</Link></li>
        <li>Download and use our mobile application — {APP_NAME}</li>
        <li>Engage with us in other related ways ― including any sales, marketing, or events</li>
      </ul>
      <p>In this privacy notice, if we refer to:</p>
      <ul>
        <li>&quot;Website,&quot; we are referring to any website of ours that references or links to this policy</li>
        <li>&quot;App,&quot; we are referring to any application of ours that references or links to this policy, including any listed above</li>
        <li>&quot;Services,&quot; we are referring to our Website, App, and other related services, including any sales, marketing, or events</li>
      </ul>
      <p>The purpose of this privacy notice is to explain to you in the clearest way possible what information we collect, how we use it, and what rights you have in relation to it. If there are any terms in this privacy notice that you do not agree with, please discontinue use of our Services immediately.</p>
      <p>Please read this privacy notice carefully, as it will help you understand what we do with the information that we collect.</p>

      <h2>1. WHAT INFORMATION DO WE COLLECT?</h2>
      <h3>Personal information you disclose to us</h3>
      <p>In Short:  We collect personal information that you provide to us.</p>
      <p>We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services (such as by posting messages in our online forums or entering competitions, contests or giveaways) or otherwise when you contact us.</p>
      <p>The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make and the products and features you use. The personal information we collect may include the following:</p>
      <p>Personal Information Provided by You. We collect names; email addresses; job titles; usernames; passwords; contact preferences; contact or authentication data; birthday; gender; and other similar information.</p>
      <p>Social Media Login Data. We may provide you with the option to register with us using your existing social media account details, like your Facebook, Twitter or other social media account. If you choose to register in this way, we will collect the information described in the section called &quot;HOW DO WE HANDLE YOUR SOCIAL LOGINS?&quot; below.</p>
      <p>All personal information that you provide to us must be true, complete and accurate, and you must notify us of any changes to such personal information.</p>
      <h3>Information automatically collected</h3>
      <p>In Short:  Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.</p>
      <p>We automatically collect certain information when you visit, use or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services and other technical information. This information is primarily needed to maintain the security and operation of our Services, and for our internal analytics and reporting purposes.</p>
      <p>Like many businesses, we also collect information through cookies and similar technologies.</p>
      <p>The information we collect includes:</p>
      <ul>
        <li>Log and Usage Data. Log and usage data is service-related, diagnostic, usage and performance information our servers automatically collect when you access or use our Services and which we record in log files. Depending on how you interact with us, this log data may include your IP address, device information, browser type and settings and information about your activity in the Services (such as the date/time stamps associated with your usage, pages and files viewed, searches and other actions you take such as which features you use), device event information (such as system activity, error reports (sometimes called &apos;crash dumps&apos;) and hardware settings).</li>
        <li>Device Data. We collect device data such as information about your computer, phone, tablet or other device you use to access the Services. Depending on the device used, this device data may include information such as your IP address (or proxy server), device and application identification numbers, location, browser type, hardware model Internet service provider and/or mobile carrier, operating system and system configuration information.</li>
        <li>Location Data. We collect location data such as information about your device&apos;s location, which can be either precise or imprecise. How much information we collect depends on the type and settings of the device you use to access the Services. For example, we may use GPS and other technologies to collect geolocation data that tells us your current location (based on your IP address). You can opt out of allowing us to collect this information either by refusing access to the information or by disabling your Location setting on your device. Note however, if you choose to opt out, you may not be able to use certain aspects of the Services.</li>
      </ul>
      <h3>Information collected through our App</h3>
      <p>In Short:  We collect information regarding your geolocation, mobile device, push notifications, when you use our App.</p>
      <p>If you use our App, we also collect the following information:</p>
      <ul>
        <li>Geolocation Information. We may request access or permission to and track location-based information from your mobile device, either continuously or while you are using our App, to provide certain location-based services. If you wish to change our access or permissions, you may do so in your device&apos;s settings.</li>
        <li>Mobile Device Access. We may request access or permission to certain features from your mobile device, including your mobile device&apos;s camera, and other features. If you wish to change our access or permissions, you may do so in your device&apos;s settings.</li>
        <li>Mobile Device Data. We automatically collect device information (such as your mobile device ID, model and manufacturer), operating system, version information and system configuration information, device and application identification numbers, browser type and version, hardware model Internet service provider and/or mobile carrier, and Internet Protocol (IP) address (or proxy server). If you are using our App, we may also collect information about the phone network associated with your mobile device, your mobile device’s operating system or platform, the type of mobile device you use, your mobile device’s unique device ID and information about the features of our App you accessed.</li>
        <li>Push Notifications. We may request to send you push notifications regarding your account or certain features of the App. If you wish to opt-out from receiving these types of communications, you may turn them off in your device&apos;s settings.</li>
      </ul>
      <p>This information is primarily needed to maintain the security and operation of our App, for troubleshooting and for our internal analytics and reporting purposes.</p>
      <h3>Information collected from other sources</h3>
      <p>In Short:  We may collect limited data from public databases, marketing partners, social media platforms, and other outside sources.</p>
      <p>In order to enhance our ability to provide relevant marketing, offers and services to you and update our records, we may obtain information about you from other sources, such as public databases, joint marketing partners, affiliate programs, data providers, social media platforms, as well as from other third parties. This information includes mailing addresses, job titles, email addresses, phone numbers, intent data (or user behavior data), Internet Protocol (IP) addresses, social media profiles, social media URLs and custom profiles, for purposes of targeted advertising and event promotion. If you interact with us on a social media platform using your social media account (e.g. Facebook or Twitter), we receive personal information about you such as your name, email address, and gender. Any personal information that we collect from your social media account depends on your social media account&apos;s privacy settings.</p>

      <h2>2. HOW DO WE USE YOUR INFORMATION?</h2>
      <p>In Short:  We process your information for purposes based on legitimate business interests, the fulfillment of our contract with you, compliance with our legal obligations, and/or your consent.</p>
      <p>We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations. We indicate the specific processing grounds we rely on next to each purpose listed below.</p>
      <p>We use the information we collect or receive:</p>
      <ul>
        <li>To facilitate account creation and logon process. If you choose to link your account with us to a third-party account (such as your Google or Facebook account), we use the information you allowed us to collect from those third parties to facilitate account creation and logon process for the performance of the contract. See the section below headed &quot;HOW DO WE HANDLE YOUR SOCIAL LOGINS?&quot; for further information.</li>
        <li>To post testimonials. We post testimonials on our Services that may contain personal information. Prior to posting a testimonial, we will obtain your consent to use your name and the content of the testimonial. If you wish to update, or delete your testimonial, please contact us at{' '}{SupportEmail}{' '}and be sure to include your name, testimonial location, and contact information.</li>
        <li>Request feedback. We may use your information to request feedback and to contact you about your use of our Services.</li>
        <li>To enable user-to-user communications. We may use your information in order to enable user-to-user communications with each user&apos;s consent.</li>
        <li>To manage user accounts. We may use your information for the purposes of managing our account and keeping it in working order.</li>
        <li>To send administrative information to you. We may use your personal information to send you product, service and new feature information and/or information about changes to our terms, conditions, and policies.</li>
        <li>To protect our Services. We may use your information as part of our efforts to keep our Services safe and secure (for example, for fraud monitoring and prevention).</li>
        <li>To enforce our terms, conditions and policies for business purposes, to comply with legal and regulatory requirements or in connection with our contract.</li>
        <li>To respond to legal requests and prevent harm. If we receive a subpoena or other legal request, we may need to inspect the data we hold to determine how to respond.</li>
        <li>Fulfill and manage your orders. We may use your information to fulfill and manage your orders, payments, returns, and exchanges made through the Services.</li>
        <li>Administer prize draws and competitions. We may use your information to administer prize draws and competitions when you elect to participate in our competitions.</li>
        <li>To deliver and facilitate delivery of services to the user. We may use your information to provide you with the requested service.</li>
        <li>To respond to user inquiries/offer support to users. We may use your information to respond to your inquiries and solve any potential issues you might have with the use of our Services.</li>
        <li>To send you marketing and promotional communications. We and/or our third-party marketing partners may use the personal information you send to us for our marketing purposes, if this is in accordance with your marketing preferences. For example, when expressing an interest in obtaining information about us or our Services, subscribing to marketing or otherwise contacting us, we will collect personal information from you. You can opt-out of our marketing emails at any time (see the &quot;WHAT ARE YOUR PRIVACY RIGHTS?&quot; below).</li>
        <li>Deliver targeted advertising to you. We may use your information to develop and display personalized content and advertising (and work with third parties who do so) tailored to your interests and/or location and to measure its effectiveness.</li>
      </ul>

      <h2>3. WILL YOUR INFORMATION BE SHARED WITH ANYONE?</h2>
      <p>In Short:  We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>
      <p>We may process or share your data that we hold based on the following legal basis:</p>
      <ul>
        <li>Consent: We may process your data if you have given us specific consent to use your personal information for a specific purpose.</li>
        <li>Legitimate Interests: We may process your data when it is reasonably necessary to achieve our legitimate business interests.</li>
        <li>Performance of a Contract: Where we have entered into a contract with you, we may process your personal information to fulfill the terms of our contract.</li>
        <li>Legal Obligations: We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process, such as in response to a court order or a subpoena (including in response to public authorities to meet national security or law enforcement requirements).</li>
        <li>Vital Interests: We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person and illegal activities, or as evidence in litigation in which we are involved.</li>
      </ul>
      <p>More specifically, we may need to process your data or share your personal information in the following situations:</p>
      <ul>
        <li>Business Transfers. We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
        <li>Vendors, Consultants and Other Third-Party Service Providers. We may share your data with third-party vendors, service providers, contractors or agents who perform services for us or on our behalf and require access to such information to do that work. Examples include: payment processing, data analysis, email delivery, hosting services, customer service and marketing efforts. We may allow selected third parties to use tracking technology on the Services, which will enable them to collect data on our behalf about how you interact with our Services over time. This information may be used to, among other things, analyze and track data, determine the popularity of certain content, pages or features, and better understand online activity. Unless described in this notice, we do not share, sell, rent or trade any of your information with third parties for their promotional purposes.</li>
        <li>Third-Party Advertisers. We may use third-party advertising companies to serve ads when you visit or use the Services. These companies may use information about your visits to our Website(s) and other websites that are contained in web cookies and other tracking technologies in order to provide advertisements about goods and services of interest to you.</li>
        <li>Business Partners. We may share your information with our business partners to offer you certain products, services or promotions.</li>
        <li>Other Users. When you share personal information (for example, by posting comments, contributions or other content to the Services) or otherwise interact with public areas of the Services, such personal information may be viewed by all users and may be publicly made available outside the Services in perpetuity. If you interact with other users of our Services and register for our Services through a social network (such as Facebook), your contacts on the social network will see your name, profile photo, and descriptions of your activity. Similarly, other users will be able to view descriptions of your activity, communicate with you within our Services, and view your profile.</li>
      </ul>

      <h2>4. WHO WILL YOUR INFORMATION BE SHARED WITH?</h2>
      <p>In Short:  We only share information with the following categories of third parties.</p>
      <p>We only share and disclose your information with the following categories of third parties. If we have processed your data based on your consent and you wish to revoke your consent, please contact us using the contact details provided in the section below titled &quot;HOW CAN YOU CONTACT US ABOUT THIS NOTICE?&quot;.</p>
      <ul>
        <li>Ad Networks</li>
        <li>Social Networks</li>
        <li>Website Hosting Service Providers</li>
        <li>Data Storage Service Providers</li>
        <li>Communication & Collaboration Tools</li>
        <li>Cloud Computing Services</li>
        <li>Performance Monitoring Tools</li>
        <li>Product Engineering & Design Tools</li>
        <li>Sales & Marketing Tools</li>
        <li>Testing Tools</li>
        <li>User Account Registration & Authentication Services</li>
      </ul>

      <h2>5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
      <p>In Short:  We may use cookies and other tracking technologies to collect and store your information.</p>
      <p>We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.</p>

      <h2>6. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</h2>
      <p>In Short:  If you choose to register or log in to our services using a social media account, we may have access to certain information about you.</p>
      <p>Our Services offers you the ability to register and login using your third-party social media account details (like your Facebook or Twitter logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, profile picture as well as other information you choose to make public on such social media platform.</p>
      <p>We will use the information we receive only for the purposes that are described in this privacy notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use and share your personal information, and how you can set your privacy preferences on their sites and apps.</p>

      <h2>7. WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?</h2>
      <p>In Short:  We are not responsible for the safety of any information that you share with third-party providers who advertise, but are not affiliated with, our Website.</p>
      <p>The Services may contain advertisements from third parties that are not affiliated with us and which may link to other websites, online services or mobile applications. We cannot guarantee the safety and privacy of data you provide to any third parties. Any data collected by third parties is not covered by this privacy notice. We are not responsible for the content or privacy and security practices and policies of any third parties, including other websites, services or applications that may be linked to or from the Services. You should review the policies of such third parties and contact them directly to respond to your questions.</p>

      <h2>8. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
      <p>In Short:  We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law.</p>
      <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.</p>
      <p>When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.</p>

      <h2>9. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
      <p>In Short:  We aim to protect your personal information through a system of organizational and technical security measures.</p>
      <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security, and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.</p>

      <h2>10. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
      <p>In Short:  You may review, change, or terminate your account at any time.</p>
      <p>If you are a resident in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your local data protection supervisory authority. You can find their contact details here: https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm.</p>
      <p>If you are a resident in Switzerland, the contact details for the data protection authorities are available here: https://www.edoeb.admin.ch/edoeb/en/home.html.</p>
      <p>If you have questions or comments about your privacy rights, you may email us at{' '}{SupportEmail}.</p>
      <h3>Account Information</h3>
      <p>If you would at any time like to review or change the information in your account or terminate your account, you can:</p>
      <ul>
        <li>Contact us using the contact information provided.</li>
      </ul>
      <p>Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Use and/or comply with applicable legal requirements.</p>
      <p>Cookies and similar technologies: Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services. To opt-out of interest-based advertising by advertisers on our Services visit http://www.aboutads.info/choices/.</p>
      <p>Opting out of email marketing: You can unsubscribe from our marketing email list at any time by clicking on the unsubscribe link in the emails that we send or by contacting us using the details provided below. You will then be removed from the marketing email list — however, we may still communicate with you, for example to send you service-related emails that are necessary for the administration and use of your account, to respond to service requests, or for other non-marketing purposes. To otherwise opt-out, you may:</p>
      <ul>
        <li>Access your account settings and update your preferences.</li>
      </ul>

      <h2>11. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
      <p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (&quot;DNT&quot;) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this privacy notice.</p>

      <h2>12. DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
      <p>In Short:  Yes, if you are a resident of California, you are granted specific rights regarding access to your personal information.</p>
      <p>California Civil Code Section 1798.83, also known as the &quot;Shine The Light&quot; law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us using the contact information provided below.</p>
      <p>If you are under 18 years of age, reside in California, and have a registered account with a Service, you have the right to request removal of unwanted data that you publicly post on the Services. To request removal of such data, please contact us using the contact information provided below, and include the email address associated with your account and a statement that you reside in California. We will make sure the data is not publicly displayed on the Services, but please be aware that the data may not be completely or comprehensively removed from all our systems (e.g. backups, etc.).</p>
      <h3>CCPA Privacy Notice</h3>
      <p>The California Code of Regulations defines a &quot;resident&quot; as:</p>
      <ol>
        <li>every individual who is in the State of California for other than a temporary or transitory purpose and</li>
        <li>every individual who is domiciled in the State of California who is outside the State of California for a temporary or transitory purpose</li>
      </ol>
      <p>All other individuals are defined as &quot;non-residents.&quot;</p>
      <p>If this definition of &quot;resident&quot; applies to you, we must adhere to certain rights and obligations regarding your personal information.</p>
      <h3>What categories of personal information do we collect?</h3>
      <p>We have collected the following categories of personal information in the past twelve (12) months:</p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Examples</th>
            <th>Collected</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A. Identifiers</td>
            <td>Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address and account name</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>B. Personal information categories listed in the California Customer Records statute</td>
            <td>Name, contact information, education, employment, employment history and financial information</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>C. Protected classification characteristics under California or federal law</td>
            <td>Gender and date of birth</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>D. Commercial information</td>
            <td>Transaction information, purchase history, financial details and payment information</td>
            <td>NO</td>
          </tr>
          <tr>
            <td>E. Biometric information</td>
            <td>Fingerprints and voiceprints</td>
            <td>NO</td>
          </tr>
          <tr>
            <td>F. Internet or other similar network activity</td>
            <td>Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems and advertisements</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>G. Geolocation data</td>
            <td>Device location</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>H. Audio, electronic, visual, thermal, olfactory, or similar information</td>
            <td>Images and audio, video or call recordings created in connection with our business activities</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>I. Professional or employment-related information</td>
            <td>Business contact details in order to provide you our services at a business level, job title as well as work history and professional qualifications if you apply for a job with us</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>J. Education Information</td>
            <td>Student records and directory information</td>
            <td>YES</td>
          </tr>
          <tr>
            <td>K. Inferences drawn from other personal information</td>
            <td>Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics</td>
            <td>YES</td>
          </tr>
        </tbody>
      </table>
      <p>We may also collect other personal information outside of these categories instances where you interact with us in-person, online, or by phone or mail in the context of:</p>
      <ul>
        <li>Receiving help through our customer support channels;</li>
        <li>Participation in customer surveys or contests; and</li>
        <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
      </ul>
      <h3>How do we use and share your personal information?</h3>
      <p>{APP_NAME} collects and shares your personal information through:</p>
      <ul>
        <li>Targeting cookies/Marketing cookies</li>
        <li>Social media cookies</li>
      </ul>
      <p>More information about our data collection and sharing practices can be found in this privacy notice.</p>
      <p>You may contact us by email at{' '}{SupportEmail}, or by referring to the contact details at the bottom of this document.</p>
      <p>If you are using an authorized agent to exercise your right to opt-out we may deny a request if the authorized agent does not submit proof that they have been validly authorized to act on your behalf.</p>
      <h3>Will your information be shared with anyone else?</h3>
      <p>We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Each service provider is a for-profit entity that processes the information on our behalf.</p>
      <p>We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be &quot;selling&quot; of your personal data.</p>
      <p>{APP_NAME} has disclosed the following categories of personal information to third parties for a business or commercial purpose in the preceding twelve (12) months:</p>
      <ul>
        <li>Category B. Personal information, as defined in the California Customer Records law, such as your name, contact information, education, employment, employment history and financial information.</li>
      </ul>
      <p>The categories of third parties to whom we disclosed personal information for a business or commercial purpose can be found under &quot;WHO WILL YOUR INFORMATION BE SHARED WITH?&quot;.</p>
      <p>{APP_NAME} has not sold any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. {APP_NAME} will not sell personal information in the future belonging to website visitors, users and other consumers.</p>
      <h3>Your rights with respect to your personal data</h3>
      <h4>Right to request deletion of the data - Request to delete</h4>
      <p>You can ask for the deletion of your personal information. If you ask us to delete your personal information, we will respect your request and delete your personal information, subject to certain exceptions provided by law, such as (but not limited to) the exercise by another consumer of his or her right to free speech, our compliance requirements resulting from a legal obligation or any processing that may be required to protect against illegal activities.</p>
      <h4>Right to be informed - Request to know</h4>
      <p>Depending on the circumstances, you have a right to know:</p>
      <ul>
        <li>whether we collect and use your personal information;</li>
        <li>the categories of personal information that we collect;</li>
        <li>the purposes for which the collected personal information is used;</li>
        <li>whether we sell your personal information to third parties;</li>
        <li>the categories of personal information that we sold or disclosed for a business purpose;</li>
        <li>the categories of third parties to whom the personal information was sold or disclosed for a business purpose; and</li>
        <li>the business or commercial purpose for collecting or selling personal information.</li>
      </ul>
      <p>In accordance with applicable law, we are not obligated to provide or delete consumer information that is de-identified in response to a consumer request or to re-identify individual data to verify a consumer request.</p>
      <h4>Right to Non-Discrimination for the Exercise of a Consumer’s Privacy Rights</h4>
      <p>We will not discriminate against you if you exercise your privacy rights.</p>
      <h4>Verification process</h4>
      <p>Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. These verification efforts require us to ask you to provide information so that we can match it with information you have previously provided us. For instance, depending on the type of request you submit, we may ask you to provide certain information so that we can match the information you provide with the information we already have on file, or we may contact you through a communication method (e.g. phone or email) that you have previously provided to us. We may also use other verification methods as the circumstances dictate.</p>
      <p>We will only use personal information provided in your request to verify your identity or authority to make the request. To the extent possible, we will avoid requesting additional information from you for the purposes of verification. If, however, we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity, and for security or fraud-prevention purposes. We will delete such additionally provided information as soon as we finish verifying you.</p>
      <h4>Other privacy rights</h4>
      <ul>
        <li>you may object to the processing of your personal data</li>
        <li>you may request correction of your personal data if it is incorrect or no longer relevant, or ask to restrict the processing of the data</li>
        <li>you can designate an authorized agent to make a request under the CCPA on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with the CCPA.</li>
        <li>you may request to opt-out from future selling of your personal information to third parties. Upon receiving a request to opt-out, we will act upon the request as soon as feasibly possible, but no later than 15 days from the date of the request submission.</li>
      </ul>
      <p>To exercise these rights, you can contact us by email at{' '}{SupportEmail}, or by referring to the contact details at the bottom of this document. If you have a complaint about how we handle your data, we would like to hear from you.</p>

      <h2>13. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
      <p>In Short:  Yes, we will update this notice as necessary to stay compliant with relevant laws.</p>
      <p>We may update this privacy notice from time to time. The updated version will be indicated by an updated &quot;Revised&quot; date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.</p>

      <h2>14. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
      <p>If you have questions or comments about this notice, you may email us at{' '}{SupportEmail}.</p>

      <h2>15. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
      <p>Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, change that information, or delete it in some circumstances. To request to review, update, or delete your personal information, please visit:{' '}<Link href={`${HOME_URL}/editprofile`}>{DOMAIN_NAME}/editprofile</Link>.</p>
    </RouteInner>
  );
}
