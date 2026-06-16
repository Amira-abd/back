import PDFDocument from 'pdfkit';
import { uploadBufferToCloudinary } from './cloudinaryService.js';

/**
 * Generates a contract PDF for a finalized deal and uploads it to Cloudinary
 * @param {object} deal - Populate deal object with buyer, seller, and product info
 * @returns {Promise<string>} Secure URL of the uploaded contract PDF
 */
export const generateContractPdf = (deal) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          const uploadResult = await uploadBufferToCloudinary(pdfBuffer, 'ecolink/contracts');
          resolve(uploadResult.secure_url);
        } catch (err) {
          reject(err);
        }
      });

      // 1. Header & Branding
      doc.fillColor('#1B4332') // Primary EcoLink Sage Green
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('ECOLINK TRANSACTION CONTRACT', { align: 'center' });
      doc.moveDown(0.2);
      
      doc.fillColor('#7F8C8D')
         .fontSize(10)
         .font('Helvetica-Oblique')
         .text('Circular Economy B2B Escrow Agreement', { align: 'center' });
      doc.moveDown(0.8);

      // Divider Line
      doc.strokeColor('#E2E8F0')
         .moveTo(50, 105)
         .lineTo(545, 105)
         .stroke();
      doc.moveDown(1.5);

      // 2. Metadata Block
      doc.fillColor('#2A2F2B')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`DEAL ID: `, { continued: true })
         .font('Helvetica')
         .text(deal._id.toString());
         
      doc.font('Helvetica-Bold')
         .text(`DATE GENERATED: `, { continued: true })
         .font('Helvetica')
         .text(new Date().toLocaleDateString('en-US', {
           weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
         }));
      doc.moveDown(1.2);

      // 3. Section: Parties
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1B4332')
         .text('1. CONTRACTING PARTIES');
         
      doc.strokeColor('#E2E8F0')
         .moveTo(50, doc.y + 2)
         .lineTo(545, doc.y + 2)
         .stroke();
      doc.moveDown(0.6);

      const buyerName = deal.buyer?.full_name || 'Verified EcoLink Buyer';
      const buyerEmail = deal.buyer?.email || 'N/A';
      const sellerName = deal.seller?.full_name || 'Verified EcoLink Seller';
      const sellerEmail = deal.seller?.email || 'N/A';

      doc.fontSize(9)
         .fillColor('#2C3E50')
         .font('Helvetica-Bold')
         .text('THE BUYER:', { continued: true })
         .font('Helvetica')
         .text(` ${buyerName} (${buyerEmail})`);
      doc.moveDown(0.3);
      
      doc.font('Helvetica-Bold')
         .text('THE SELLER:', { continued: true })
         .font('Helvetica')
         .text(` ${sellerName} (${sellerEmail})`);
      doc.moveDown(1.2);

      // 4. Section: Material Specifications
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1B4332')
         .text('2. ACQUIRED MATERIAL SPECIFICATIONS');
         
      doc.strokeColor('#E2E8F0')
         .moveTo(50, doc.y + 2)
         .lineTo(545, doc.y + 2)
         .stroke();
      doc.moveDown(0.6);

      const matName = deal.product?.title || 'Custom Sourcing Material';
      const categoryName = deal.product?.category_id?.name || 'N/A';
      const quantity = deal.quantity || 1;
      const unit = deal.product?.unit || 'units';
      const description = deal.product?.description || 'No additional description provided.';

      doc.fontSize(9)
         .fillColor('#2C3E50')
         .font('Helvetica-Bold')
         .text('Material Name: ', { continued: true })
         .font('Helvetica')
         .text(matName);
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold')
         .text('Category: ', { continued: true })
         .font('Helvetica')
         .text(categoryName);
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold')
         .text('Quantity: ', { continued: true })
         .font('Helvetica')
         .text(`${quantity} ${unit}`);
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold')
         .text('Description / Quality Notes: \n')
         .font('Helvetica')
         .text(description, { align: 'justify', lineGap: 2 });
      doc.moveDown(1.2);

      // 5. Section: Commercial Details
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1B4332')
         .text('3. COMMERCIAL DETAILS & VALUATION');
         
      doc.strokeColor('#E2E8F0')
         .moveTo(50, doc.y + 2)
         .lineTo(545, doc.y + 2)
         .stroke();
      doc.moveDown(0.6);

      const unitPrice = deal.offeredPrice || 0;
      const subtotal = unitPrice * quantity;

      doc.fontSize(9)
         .fillColor('#2C3E50')
         .font('Helvetica-Bold')
         .text('Agreed Price: ', { continued: true })
         .font('Helvetica')
         .text(`$${unitPrice.toFixed(2)} USD`);
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold')
         .text('Total Amount: ', { continued: true })
         .font('Helvetica')
         .text(`$${subtotal.toFixed(2)} USD`);
      doc.moveDown(1.2);

      // 6. Section: Escrow Terms
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1B4332')
         .text('4. ESCROW & SETTLEMENT POLICIES');
         
      doc.strokeColor('#E2E8F0')
         .moveTo(50, doc.y + 2)
         .lineTo(545, doc.y + 2)
         .stroke();
      doc.moveDown(0.6);

      doc.fontSize(8.5)
         .fillColor('#2C3E50')
         .font('Helvetica')
         .text(
           'The parties agree that all payments are secured under the EcoLink Escrow framework. ' +
           'The Buyer commits to deposing the total transaction value into Escrow upon signing. ' +
           'The Seller commits to logistics dispatch and shipping update. Funds are held securely and released ' +
           'to the Seller instantly once the Buyer confirms receipt and quality verification on the platform, ' +
           'or automatically after the local clearance verification period.',
           { align: 'justify', lineGap: 3 }
         );
      doc.moveDown(2.5);

      // 7. Signature Sections
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('For the Buyer:', 50, doc.y);
      doc.font('Helvetica')
         .text('_________________________________', 50, doc.y + 15);
      doc.fontSize(8)
         .text(`Authorized Signature`, 50, doc.y + 10)
         .text(`Representative: ${buyerName}`, 50, doc.y + 10);

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('For the Seller:', 330, doc.y - 45); // offset spacing relative to buyer
      doc.font('Helvetica')
         .text('_________________________________', 330, doc.y + 15);
      doc.fontSize(8)
         .text(`Authorized Signature`, 330, doc.y + 10)
         .text(`Representative: ${sellerName}`, 330, doc.y + 10);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  generateContractPdf
};
