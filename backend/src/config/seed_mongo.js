import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = config.mongoUri;

// --- SCHEMAS MONGOOSE ---
const FoodSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  brand: { type: String, index: true },
  portion_size_g: Number,
  portion_description: String,
  carbs_per_portion: Number,
  source: String,
  is_verified: { type: Boolean, default: true },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'CAREGIVER'], default: 'PATIENT' },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const PatientProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  birth_date: Date,
  diabetes_type: { type: String, enum: ['T1D', 'T2D', 'LADA', 'MODY', 'GESTATIONAL'], default: 'T1D' },
  weight_kg: Number,
  height_cm: Number,
  target_glucose_min: { type: Number, default: 70 },
  target_glucose_max: { type: Number, default: 140 },
  isf_mgdl_per_unit: { type: Number, default: 50 },
  icr_g_per_unit: { type: Number, default: 15 },
  basal_daily_dose_units: Number
}, { timestamps: true });

const GlucoseReadingSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  glucose_mgdl: { type: Number, required: true },
  read_at: { type: Date, required: true },
  sensor_id: String,
  record_type: { type: String, default: 'AUTOMATIC_CGM' },
  source: { type: String, default: 'LibreView Export' }
}, { timestamps: true });

const Food = mongoose.models.Food || mongoose.model('Food', FoodSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const PatientProfile = mongoose.models.PatientProfile || mongoose.model('PatientProfile', PatientProfileSchema);
const GlucoseReading = mongoose.models.GlucoseReading || mongoose.model('GlucoseReading', GlucoseReadingSchema);

export async function seedMongoDatabase() {
  try {
    console.log('🔄 Conectando ao MongoDB Atlas...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000
    });
    console.log('✅ Conectado ao MongoDB Atlas!');

    const foodCount = await Food.countDocuments();
    console.log(`📊 Total atual de alimentos no MongoDB Atlas: ${foodCount}`);

    // Se a base de alimentos não foi populada, executa o stream de 488k
    if (foodCount < 400000) {
      console.log('🚀 Iniciando envio da base UNIFICADA COMPLETA (488.123 alimentos) para o MongoDB Atlas...');
      const sqlPath = path.join(__dirname, '../../../database/seeds/001_seed_unified_foods.sql');
      if (fs.existsSync(sqlPath)) {
        await Food.deleteMany({});
        const fileStream = fs.createReadStream(sqlPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
        const regex = /\(UUID\(\),\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*([\d.]+),\s*'((?:''|[^'])*)',\s*([\d.]+),\s*'((?:''|[^'])*)',\s*(TRUE|FALSE),\s*(TRUE|FALSE)\)/gi;

        let batch = [];
        let totalInserted = 0;
        for await (const line of rl) {
          if (!line.startsWith('(UUID()')) continue;
          regex.lastIndex = 0;
          const match = regex.exec(line);
          if (match) {
            batch.push({
              name: match[1].replace(/''/g, "'"),
              brand: match[2].replace(/''/g, "'"),
              portion_size_g: parseFloat(match[3]),
              portion_description: match[4].replace(/''/g, "'"),
              carbs_per_portion: parseFloat(match[5]),
              source: match[6].replace(/''/g, "'"),
              is_verified: match[7].toUpperCase() === 'TRUE',
              is_active: match[8].toUpperCase() === 'TRUE'
            });
          }
          if (batch.length >= 5000) {
            await Food.insertMany(batch, { ordered: false });
            totalInserted += batch.length;
            batch = [];
          }
        }
        if (batch.length > 0) {
          await Food.insertMany(batch, { ordered: false });
          totalInserted += batch.length;
        }
        console.log(`🎉 Base de alimentos unificada populada: ${totalInserted} registros!`);
      }
    }

    // --- CRIAÇÃO / ATUALIZAÇÃO DO USUÁRIO PEDRO ---
    console.log('👤 Garantindo existência do usuário Pedro no MongoDB Atlas, Postgres e Cache...');
    const pedroEmail = 'pedro@leben.app';
    const passwordHash = bcrypt.hashSync('Pedro123', 10);

    // 1. Cadastra / Atualiza no MongoDB Atlas
    let pedroUser = await User.findOne({ email: pedroEmail });

    if (!pedroUser) {
      pedroUser = await User.create({
        email: pedroEmail,
        password_hash: passwordHash,
        full_name: 'Pedro',
        role: 'PATIENT',
        is_active: true
      });
      console.log('✅ Usuário Pedro criado com sucesso no MongoDB!');
    } else {
      pedroUser.password_hash = passwordHash;
      await pedroUser.save();
      console.log('✅ Senha do usuário Pedro atualizada para Pedro123 no MongoDB!');
    }

    // 2. Cadastra no Cache RAM do Backend
    try {
      const { registeredUsersCache } = await import('../controllers/authController.js');
      registeredUsersCache.set(pedroEmail, {
        id: pedroUser._id.toString(),
        name: 'Pedro',
        email: pedroEmail,
        passwordHash: passwordHash,
        role: 'PATIENT',
        diabetesType: 'TYPE_1',
        createdAt: new Date().toISOString()
      });
      console.log('✅ Usuário Pedro registrado no Cache RAM!');
    } catch (cacheErr) {}

    // 3. Cadastra no PostgreSQL se disponível
    try {
      const { query } = await import('./database.js');
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, diabetes_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (email) DO UPDATE SET password_hash = $4`,
        [pedroUser._id.toString(), 'Pedro', pedroEmail, passwordHash, 'PATIENT', 'TYPE_1']
      );
      console.log('✅ Usuário Pedro registrado no PostgreSQL!');
    } catch (pgErr) {}


    // Garante perfil do Pedro
    let pedroProfile = await PatientProfile.findOne({ user_id: pedroUser._id });
    if (!pedroProfile) {
      await PatientProfile.create({
        user_id: pedroUser._id,
        diabetes_type: 'T1D',
        weight_kg: 70,
        height_cm: 175,
        target_glucose_min: 70,
        target_glucose_max: 140,
        isf_mgdl_per_unit: 50,
        icr_g_per_unit: 15,
        basal_daily_dose_units: 24
      });
      console.log('✅ Perfil clínico do Pedro criado!');
    }

    // --- IMPORTAÇÃO DOS DADOS DO LIBREVIEW PARA A CONTA DO PEDRO ---
    console.log('📊 Importando dados do sensor LibreView para a conta do Pedro...');
    const candidatePaths = [
      path.join(__dirname, 'Libreview2026-07-29-14_29_14.csv'),
      path.join(__dirname, '../Libreview2026-07-29-14_29_14.csv'),
      path.join(__dirname, '../../Libreview2026-07-29-14_29_14.csv'),
      path.join(__dirname, '../../../Libreview2026-07-29-14_29_14.csv'),
      path.join(process.cwd(), 'Libreview2026-07-29-14_29_14.csv'),
      path.join(process.cwd(), 'backend/src/config/Libreview2026-07-29-14_29_14.csv'),
      path.join(process.cwd(), 'backend/Libreview2026-07-29-14_29_14.csv')
    ];

    const librePath = candidatePaths.find(p => fs.existsSync(p));
    
    if (librePath) {
      const csvContent = fs.readFileSync(librePath, 'utf-8');
      const lines = csvContent.split('\n');
      const readings = [];

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length >= 5) {
          const rawDateStr = cols[2]; // Formato: "29-07-2026 06:20"
          const glucoseVal = parseInt(cols[4], 10);

          if (rawDateStr && !isNaN(glucoseVal)) {
            const [datePart, timePart] = rawDateStr.split(' ');
            const [day, month, year] = datePart.split('-');
            const isoDateStr = `${year}-${month}-${day}T${timePart}:00-03:00`;
            
            readings.push({
              patient_id: pedroUser._id,
              glucose_mgdl: glucoseVal,
              read_at: new Date(isoDateStr),
              sensor_id: cols[1] || '876b812a-eb14-614a-c5a7-b9d9bee479f4',
              record_type: 'AUTOMATIC_CGM',
              source: 'LibreView Export'
            });
          }
        }
      }

      const existingReadingsCount = await GlucoseReading.countDocuments({ patient_id: pedroUser._id });
      if (readings.length > 0) {
        await GlucoseReading.deleteMany({ patient_id: pedroUser._id });
        await GlucoseReading.insertMany(readings);
        console.log(`✅ ${readings.length} medições REAIS do sensor Libre 2 (UID: 876b812a) importadas com sucesso para a conta do Pedro!`);
      }
    } else {
      console.error('⚠️ Arquivo Libreview2026-07-29-14_29_14.csv não encontrado.');
    }

  } catch (error) {
    console.error('❌ Erro no procedimento:', error.message);
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed_mongo.js')) {
  seedMongoDatabase().then(() => mongoose.disconnect());
}
