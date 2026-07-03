// Datos iniciales pre-cargados desde la hoja 2026 del Excel
const SEED_ANIO = 2026;
const SEED_GASTOS = [
  {
    "id": 1,
    "nombre": "Luz",
    "categoria": "Servicio",
    "montos": [
      134690.84,
      137732.21,
      165881.77,
      176856.54,
      116716.51,
      115450.81,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 2,
    "nombre": "Gas",
    "categoria": "Servicio",
    "montos": [
      20178.32,
      20733.05,
      18329.05,
      16888.27,
      21241.8,
      20957.54,
      56683.91,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 3,
    "nombre": "ABSA",
    "categoria": "Servicio",
    "montos": [
      6887.26,
      6887.26,
      6887.26,
      12396.8,
      12396.8,
      10238.49,
      10238.49,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 4,
    "nombre": "ABL (10003650)",
    "categoria": "Impuestos",
    "montos": [
      0,
      0,
      0,
      0,
      0,
      12882.65,
      15331.25,
      15331.25,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 5,
    "nombre": "AGUA (10003650)",
    "categoria": "Servicio",
    "montos": [
      0,
      0,
      0,
      0,
      0,
      7636.05,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 6,
    "nombre": "Seguro Auto",
    "categoria": "Seguros",
    "montos": [
      68377.0,
      68377.0,
      68377.0,
      69869.48,
      69871.0,
      69871.0,
      69871.0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 7,
    "nombre": "Seguro de Vida",
    "categoria": "Seguros",
    "montos": [
      2017.52,
      2017.52,
      2017.52,
      2017.52,
      2017.52,
      2017.52,
      2017.52,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 8,
    "nombre": "Seguro de Hogar",
    "categoria": "Seguros",
    "montos": [
      50365.2,
      50365.2,
      50365.2,
      50365.2,
      50365.2,
      50365.2,
      50365.2,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 9,
    "nombre": "Patente",
    "categoria": "Impuestos",
    "montos": [
      0,
      0,
      12524.3,
      12853.9,
      13165.6,
      13571.3,
      13900.9,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 10,
    "nombre": "Teléfono Fede",
    "categoria": "Servicio",
    "montos": [
      14000.0,
      14000.0,
      14630.01,
      15212.1,
      19754.99,
      20642.48,
      21672.49,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 11,
    "nombre": "Fibertel",
    "categoria": "Servicio",
    "montos": [
      84000.0,
      86073.99,
      88465.0,
      91735.99,
      94798.0,
      97883.99,
      118093.71,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 12,
    "nombre": "Monotributo Flor",
    "categoria": "Impuestos",
    "montos": [
      13663.17,
      15616.17,
      15616.17,
      15616.17,
      15616.17,
      15616.17,
      15616.17,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 13,
    "nombre": "VEP Sonia",
    "categoria": "Otros",
    "montos": [
      13076.37,
      13727.08,
      13727.08,
      13955.89,
      14077.89,
      14077.89,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 14,
    "nombre": "Ingles (Lolo)",
    "categoria": "Educación",
    "montos": [
      0,
      0,
      30000.0,
      30000.0,
      30000.0,
      33000.0,
      33000.0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 15,
    "nombre": "Defensores",
    "categoria": "Deportes",
    "montos": [
      66000.0,
      74000.0,
      101000.0,
      71000.0,
      101000.0,
      122000.0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 16,
    "nombre": "Velez Sarsfield",
    "categoria": "Deportes",
    "montos": [
      24300.0,
      24300.0,
      24300.0,
      24300.0,
      29250.0,
      29250.0,
      29250.0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 17,
    "nombre": "Mercadopago",
    "categoria": "Otros",
    "montos": [
      399241.65,
      1360218.15,
      2049397.89,
      1914930.21,
      1838953.52,
      1728025.62,
      1696076.17,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 18,
    "nombre": "Galicia - Visa",
    "categoria": "Otros",
    "montos": [
      664588.41,
      396913.32,
      479197.47,
      416476.18,
      716344.73,
      356874.76,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 19,
    "nombre": "Galicia - Mastercard",
    "categoria": "Otros",
    "montos": [
      336690.4,
      308089.88,
      70405.01,
      60405.01,
      20405.01,
      209178.84,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 20,
    "nombre": "Banco Provincia - Visa - Flor",
    "categoria": "Otros",
    "montos": [
      206259.56,
      111460.21,
      61259.34,
      81227.27,
      108887.91,
      84894.44,
      79702.34,
      0,
      0,
      0,
      0,
      0
    ]
  }
];

// Ingresos base (los montos se cargan desde el ABM de Ingresos)
const SEED_INGRESOS = [
  {
    "id": 1,
    "nombre": "Sueldo Fede",
    "tipo": "Sueldo",
    "montos": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 2,
    "nombre": "Sueldo Flor",
    "tipo": "Sueldo",
    "montos": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  }
];
