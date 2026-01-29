
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
    return (
        <Shell>
            <div className="max-w-4xl mx-auto py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                        <p className="text-sm text-muted-foreground">Last updated: January 9, 2026</p>

                        <h3>1. Introduction</h3>
                        <p>
                            Welcome to <strong>Competitor Intelligence Suite</strong> ("we," "our," or "us").
                            We are committed to protecting your personal information and your right to privacy.
                            If you have any questions or concerns about this privacy notice or our practices with regard to your personal information,
                            please contact us.
                        </p>

                        <h3>2. What Information We Collect</h3>
                        <p>We collect personal information that you voluntarily provide to us when you register on the application, express an interest in obtaining information about us or our products and services, when you participate in activities on the application, or otherwise when you contact us.</p>
                        <p>The personal information that we collect depends on the context of your interactions with us and the application, the choices you make, and the products and features you use.</p>

                        <h3>3. How We Use Your Information</h3>
                        <p>We use personal information collected via our application for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
                        <ul>
                            <li><strong>To facilitate account creation and logon process.</strong></li>
                            <li><strong>To obtain data from Third-Party APIs.</strong> We may use your credentials to access third-party services (such as Meta/Facebook Ad Library) on your behalf to provide competitor analysis services. We do not store your raw passwords, but we store encrypted access tokens required to maintain the connection.</li>
                        </ul>

                        <h3>4. Meta (Facebook) Data</h3>
                        <p>Our application integrates with the Meta Platform to provide advertising intelligence. In accordance with Meta's Platform Policy:</p>
                        <ul>
                            <li>We only use permitted data APIs (such as the Ad Library API) to fetch public advertising data.</li>
                            <li>We do not share your private ad account measure or performance data with third parties without your explicit consent.</li>
                            <li>You may disconnect the Meta integration at any time from the Settings page, which will remove our access to your account.</li>
                        </ul>

                        <h3>5. Contact Us</h3>
                        <p>If you have questions or comments about this notice, you may email us at support@maromcosmetic.com.</p>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
