import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: 'dyh1xpfgm', 
  api_key: '197399561289678', 
  api_secret: 'yoXDV_hu8HEkhy98eG4_rugB5Xk' 
});

async function run() {
  try {
    // 2. Upload an image
    console.log("Uploading sample image...");
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      { public_id: 'test_sample' }
    );
    console.log("Upload successful!");
    console.log("Secure URL:", uploadResult.secure_url);
    console.log("Public ID:", uploadResult.public_id);

    // 3. Get image details
    console.log("\nImage Details:");
    console.log("- Width:", uploadResult.width);
    console.log("- Height:", uploadResult.height);
    console.log("- Format:", uploadResult.format);
    console.log("- Size (bytes):", uploadResult.bytes);

    // 4. Transform the image
    // f_auto: automatically chooses the most efficient image format (e.g., WebP/AVIF) for the requesting browser
    // q_auto: automatically adjusts compression quality to reduce file size while maintaining visual fidelity
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });

    console.log("\nDone! Click link below to see optimized version of the image. Check the size and the format.");
    console.log(transformedUrl);

  } catch (error) {
    console.error("Error running Cloudinary script:", error);
  }
}

run();
