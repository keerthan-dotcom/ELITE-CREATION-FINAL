import { Layout } from '@/components/layout/Layout';

const TermsAndConditions = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        
        <div className="prose prose-slate max-w-none text-muted-foreground space-y-6">
          <p>
            Welcome to Elite Creations. By accessing or using our website and purchasing our school uniforms, 
            you agree to comply with and be bound by the following terms and conditions.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. General Overview</h2>
          <p>
            Elite Creations operates this website to provide high-quality school uniforms to students and parents 
            in Bangalore. We reserve the right to update or modify these terms at any time without prior notice. 
            Your continued use of the website following any changes indicates your acceptance of the new terms.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Products and Pricing</h2>
          <p>
            We strive to ensure that all product descriptions, images, and pricing on our website are accurate. 
            However, slight variations in color or texture may occur due to display differences on digital devices. 
            All prices are subject to change without notice. In the event of a pricing error, we reserve the right 
            to cancel any orders placed at the incorrect price.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Ordering and Payment</h2>
          <p>
            By placing an order, you confirm that all information provided is accurate and complete. We use secure 
            payment gateways (such as Razorpay) to process transactions. Once an order is confirmed and payment is 
            received, you will receive an order confirmation via your registered contact details.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Shipping and Delivery</h2>
          <p>
            We aim to dispatch all orders promptly. Delivery times may vary depending on the location and the 
            availability of stock. While we make every effort to deliver within the estimated timeframe, Elite Creations 
            is not liable for any delays caused by third-party delivery services or unforeseen circumstances.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Returns and Refunds</h2>
          <p>
            We have a dedicated Return and Refund policy integrated directly into our platform. If you receive a 
            defective product or an incorrect size, you can initiate a return through the "My Orders" section of your 
            account. Returns must be requested within the stipulated time frame, and items must be unused, unwashed, 
            and in their original packaging.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Privacy and Data Security</h2>
          <p>
            We value your privacy. Any personal information collected during the ordering process—such as your name, 
            phone number, email, and shipping address—is strictly used for processing your orders and improving your 
            shopping experience. We do not sell your data to third parties.
          </p>

          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Contact Information</h2>
          <p>
            If you have any questions or concerns regarding these Terms and Conditions, please feel free to reach out to us:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li><strong>Phone:</strong> 9986697655</li>
            <li><strong>Email:</strong> elitecerations365@gmail.com</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default TermsAndConditions;
