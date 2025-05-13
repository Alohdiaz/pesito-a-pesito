# Pesito a Pesito — Plataforma SaaS de Asistencia Financiera con IA

**Pesito a Pesito** es una plataforma de análisis bursátil impulsada por inteligencia artificial. Permite a los usuarios consultar datos financieros, analizar tendencias de mercado y realizar pagos mediante blockchain en una interfaz moderna, responsiva y potenciada por un chatbot IA.

---

## Características Principales

* **Asistente financiero con IA**: Consulta información bursátil en lenguaje natural.
* **Datos de mercado en tiempo real**: Integración con TradingView.
* **Autenticación segura**: Mediante Clerk.
* **Sistema de suscripciones**:

  * Plan gratuito con límites.
  * Plan premium con historial, mensajes ilimitados y funciones avanzadas.
* **Pagos con criptomonedas**: Vía contrato inteligente en la red de pruebas Sepolia.
* **Diseño responsivo**: Adaptado para cualquier dispositivo.

---

##  Tecnologías Utilizadas

* **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
* **Backend**: API Routes de Next.js, Prisma ORM
* **Base de Datos**: SQLite (desarrollo) / PostgreSQL (producción)
* **Autenticación**: Clerk
* **IA**: OpenAI + Vercel AI SDK (GPT-4o)
* **Datos financieros**: TradingView Widgets
* **Blockchain**: Contrato inteligente en Sepolia (Ethereum Testnet)

---

## Versiones de Suscripción

### Gratuita:

* IA limitada a 3 mensajes por sesión.
* Sin historial de conversaciones.

### Premium:

* Acceso completo al asistente IA.
* Historial de chats.
* Integración DeFi y pagos cripto.
* Datos financieros extendidos.

---

## Estructura del Proyecto

```
├── app/                 # Rutas y páginas
├── components/          # Componentes visuales
├── lib/                 # Hooks, store y utilidades
├── prisma/              # Esquema de base de datos
├── public/              # Recursos estáticos
├── .env.local           # Variables de entorno (no incluida en el repo)
├── package.json         # Dependencias y scripts
└── tailwind.config.ts   # Configuración de Tailwind CSS
```

---

## Despliegue

* Desplegado en [Vercel](https://vercel.com)
---

## Créditos

Desarrollado por:

* Alvaro (**@alvarow90**) — Interfaces, rutas de usuario, estilos y vistas.
* Diego (**@alohdiaz**) — Lógica de backend, integración con IA y estructura del sistema.

---