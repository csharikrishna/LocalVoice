import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ 
  cloud_name: 'dyh1xpfgm', 
  api_key: '197399561289678', 
  api_secret: 'yoXDV_hu8HEkhy98eG4_rugB5Xk' 
});

async function run() {
  try {
    const result = await cloudinary.api.create_upload_preset({
      name: "civicscan_unsigned",
      unsigned: true,
      folder: "civicscan_complaints"
    });
    console.log("Preset created successfully:", result.name);
  } catch (err) {
    // If it already exists, that's fine
    if (err && err.error && err.error.message && err.error.message.includes("already exists")) {
       console.log("Preset already exists, ready to use!");
    } else {
       console.error("Error creating preset:", err);
    }
  }
}

run();
