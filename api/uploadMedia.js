import { v2 as cloudinary } from 'cloudinary';
import multiparty from 'multiparty';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the .env file from the process root (avoids Vite cache directory issues)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure Cloudinary inside a function so it always runs AFTER dotenv has
// finished populating process.env (top-level config runs too early in Vite's
// module cache and sees empty env vars, causing "Must supply cloud_name").
function configureCloudinary() {
  if (process.env['CLOUDINARY_URL']) {
    cloudinary.config(true); // CLOUDINARY_URL already encodes all credentials
  } else {
    const cloudName  = process.env['CLOUDINARY_CLOUD_NAME'];
    const apiKey     = process.env['CLOUDINARY_API_KEY'];
    const apiSecret  = process.env['CLOUDINARY_API_SECRET'];

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Missing Cloudinary credentials. Ensure CLOUDINARY_CLOUD_NAME, ' +
        'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in your .env file.'
      );
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  // Configure on every request so credentials are always fresh
  try {
    configureCloudinary();
  } catch (configError) {
    console.error('[Cloudinary] Config error:', configError.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: configError.message }));
  }

  try {
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: 'Error parsing form data' }));
      }

      try {
        let uploadResult;

        // 1. File upload
        if (files?.file?.length > 0) {
          const file = files.file[0];
          uploadResult = await cloudinary.uploader.upload(file.path, {
            resource_type: 'auto',
            folder: 'ASCII/Upload',
          });

        // 2. Base64 string (exports)
        } else if (fields?.base64?.length > 0) {
          uploadResult = await cloudinary.uploader.upload(fields.base64[0], {
            resource_type: 'auto',
            folder: 'ASCII/Export',
          });

        // 3. Remote URL
        } else if (fields?.url?.length > 0) {
          uploadResult = await cloudinary.uploader.upload(fields.url[0], {
            resource_type: 'auto',
            folder: 'ASCII/Upload',
          });

        } else {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'No file, base64 data, or URL provided' }));
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: true,
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        }));

      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        res.statusCode = 500;
        return res.end(JSON.stringify({
          error: 'Failed to upload to Cloudinary',
          details: uploadError.message,
        }));
      }
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
