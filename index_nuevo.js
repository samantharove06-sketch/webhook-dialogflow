const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Precios de los productos
const precios = {
  producto_labial: 55.00,
  producto_base: 125.00,
  producto_iluminador: 45.00,
  producto_sombras: 145.00,
  producto_mascara: 49.50
};

// Nombres de los productos
const nombres = {
  producto_labial: "labiales",
  producto_base: "bases",
  producto_iluminador: "iluminadores",
  producto_sombras: "sombras",
  producto_mascara: "máscaras"
};

// Cantidades máximas por producto
const parametrosCantidad = {
  producto_labial: "cantLabial",
  producto_base: "cantBase",
  producto_iluminador: "cantIluminador",
  producto_sombras: "cantSombras",
  producto_mascara: "cantMascara"
};

app.post("/", (req, res) => {

  const queryResult = req.body.queryResult || {};
  const intent = queryResult.intent?.displayName || "";

  // Cantidad solicitada
  let cantidad = Number(queryResult.parameters?.cantidad || 1);

  if (!Number.isFinite(cantidad) || cantidad < 1) {
    cantidad = 1;
  }

  cantidad = Math.floor(cantidad);

  // Contexto actual del carrito
  const contextos = queryResult.outputContexts || [];

  let carrito = contextos.find(
    c => c.name.endsWith("/contexts/carrito_context")
  );

  let parametros = carrito?.parameters || {};

  // Valores actuales del carrito
  let totalCarrito = Number(parametros.totalCarrito || 0);

  let cantLabial = Number(parametros.cantLabial || 0);
  let cantBase = Number(parametros.cantBase || 0);
  let cantIluminador = Number(parametros.cantIluminador || 0);
  let cantSombras = Number(parametros.cantSombras || 0);
  let cantMascara = Number(parametros.cantMascara || 0);

  // --------------------------------------------------
  // PRODUCTOS
  // --------------------------------------------------

  if (precios[intent]) {

    const precio = precios[intent];
    const nombre = nombres[intent];
    const parametroCantidad = parametrosCantidad[intent];

    let cantidadActual = Number(parametros[parametroCantidad] || 0);

    // Comprobar límite máximo de 5
    if (cantidadActual + cantidad > 5) {

      const disponibles = 5 - cantidadActual;

      if (disponibles <= 0) {
        return res.json({
          fulfillmentText:
            `Ya tienes el máximo de 5 ${nombre} en tu carrito. ` +
            `No puedes agregar más de este producto.`
        });
      }

      return res.json({
        fulfillmentText:
          `Solo puedes agregar ${disponibles} ${nombre} más. ` +
          `El máximo permitido es de 5 ${nombre}.`
      });
    }

    // Subtotal del producto
    const subtotal = cantidad * precio;

    // Agregar al carrito
    totalCarrito += subtotal;
    parametros[parametroCantidad] = cantidadActual + cantidad;

    // Actualizar las cantidades
    cantLabial = Number(parametros.cantLabial || 0);
    cantBase = Number(parametros.cantBase || 0);
    cantIluminador = Number(parametros.cantIluminador || 0);
    cantSombras = Number(parametros.cantSombras || 0);
    cantMascara = Number(parametros.cantMascara || 0);

    parametros.totalCarrito = totalCarrito;

    return res.json({
      fulfillmentText:
        `Has seleccionado ${cantidad} ${nombre}. ` +
        `El precio por pieza es de $${precio.toFixed(2)} MXN. ` +
        `Tu subtotal es de $${subtotal.toFixed(2)} MXN. ` +
        `Tu carrito lleva $${totalCarrito.toFixed(2)} MXN. ` +
        `¿Deseas agregar otro producto?`,

      outputContexts: [
        {
          name: `${req.body.session}/contexts/carrito_context`,
          lifespanCount: 20,
          parameters: parametros
        }
      ]
    });
  }

  // --------------------------------------------------
  // FINALIZAR COMPRA
  // --------------------------------------------------

  if (intent === "finalizar_compra") {

    if (totalCarrito <= 0) {
      return res.json({
        fulfillmentText:
          "Tu carrito está vacío. Primero agrega algún producto."
      });
    }

    return res.json({
      fulfillmentText:
        `El total de tu compra es de $${totalCarrito.toFixed(2)} MXN. ` +
        `¿Deseas confirmar tu compra?`,

      outputContexts: [
        {
          name: `${req.body.session}/contexts/carrito_context`,
          lifespanCount: 20,
          parameters: parametros
        }
      ]
    });
  }

  // --------------------------------------------------
  // CONFIRMAR COMPRA
  // --------------------------------------------------

  if (intent === "confirmar_compra") {

    if (totalCarrito <= 0) {
      return res.json({
        fulfillmentText:
          "No hay productos en tu carrito para confirmar."
      });
    }

    const totalFinal = totalCarrito;

    return res.json({
      fulfillmentText:
        `¡Compra confirmada! 🎉 ` +
        `El total de tu compra es de $${totalFinal.toFixed(2)} MXN. ` +
        `Gracias por tu compra.`,

      outputContexts: []
    });
  }

  // --------------------------------------------------
  // RESPUESTA POR DEFECTO
  // --------------------------------------------------

  return res.json({
    fulfillmentText:
      "No pude procesar esa solicitud."
  });

});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
