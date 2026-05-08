const XLSX = require('xlsx');

const data = [
  { Nama: 'ADIAS FERDIAN NAWAWI', NISN: '0126450562', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'ADINDA RAHMAWATI', NISN: '0138131948', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'AGUNG FATHEKHA', NISN: '0086704048', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'ALDI MULFAIS', NISN: '0121071622', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'ALIF NAZRIL ILHAM', NISN: '0119206434', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'Aqila Khesia Marella', NISN: '3120591379', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'ARILIN AFRILIANI', NISN: '0122961005', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'DEO MALO', NISN: '0116618791', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'IKHSANNUDIN', NISN: '0113676385', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'INDI ROHENI', NISN: '0124143291', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'KADMINAH', NISN: '3116143874', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'MAULANA ABU HUDZAIFAH', NISN: '3126703320', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'MAULANA SIDIQ', NISN: '3134583984', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'MOH SYAFIQ ULINUHA', NISN: '3129434529', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'MUHAMAD ABIL WAFA', NISN: '0092673953', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'MUHAMMAD AFRIZAL', NISN: '3134592846', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'Muhammad Fardana', NISN: '0097520114', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'MUHAMMAD KHAIDAR AL\'AZIZ', NISN: '3136450044', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'MUHAMMAD NGUBAIDURROKHMAN', NISN: '0158365299', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'NADIF ASSATIBI', NISN: '0144594142', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'NAZLAH SIBRIYAH', NISN: '0106717224', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'NURLAELA', NISN: '3125061971', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'NURLAELI', NISN: '3131753491', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'NURSUCI', NISN: '0125307770', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'PUPUT MELATI', NISN: '0122918934', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'RAFAEL', NISN: '0112214220', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'REVAN', NISN: '0087480354', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'RODHOTUL JANNAH', NISN: '3128755216', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'ROSITA', NISN: '3115633122', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'SAFIRA KIREINA NAWAWI', NISN: '3147905878', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'Satriya Ade Ros Saputra', NISN: '0104976945', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'SELVIA', NISN: '0088884410', Kelas: '9A', No_WA: '6283148100602' },
  { Nama: 'SINTIYANI', NISN: '0099313457', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'SUBKHI HIDAYAT', NISN: '3135246176', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'YOSIPATUL DWI ARIYANTO', NISN: '0099777724', Kelas: '8A', No_WA: '6283148100602' },
  { Nama: 'YUDHISTIRA RAMADHAN', NISN: '0138805947', Kelas: '7A', No_WA: '6283148100602' },
  { Nama: 'YUSUP INDRAWAN', NISN: '0105019396', Kelas: '9A', No_WA: '6283148100602' }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Data Santri");

const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '..', 'Data_Santri_Import.xlsx');

XLSX.writeFile(workbook, outputPath);
console.log('File created at ' + outputPath);
