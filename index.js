const express = require("express");

const app = express();
app.use(express.json());

// =====================================
// PRECIOS DE LOS PRODUCTOS
// =====================================

const precios = {
  producto_labial: 55.00,
  producto_base: 125.00,
  producto_iluminador: 45.00,
  producto_sombras: 145.00,
  producto_mascara: 49.50
};

// =====================================
// NOMBRES DE LOS PRODUCTOS
// =====================================

const nombres = {
  producto_labial: "labiales",
  producto_base: "bases",
  producto_iluminador: "iluminadores",
  producto_sombras: "sombras",
  producto_mascara: "máscaras"
};

// =====================================
// CANTIDADES MÁXIMAS POR PRODUCTO
// =====================================

const cantidades = {
  producto_labial: "cantLabial",
  producto_base: "cantBase",
  producto_iluminador: "cantIluminador",
  producto_sombras: "cantSombras",
  producto_mascara: "cantMascara"
};

// =====================================
// WEBHOOK DE DIALOGFLOW
// =====================================

app.post("/webhook", (req, res) => {

  const queryResult = req.body.queryResult;

  if (!queryResult) {
    return res.json({
      fulfillmentText: "No pude recibir la información de la compra."
    });
  }

  // Nombre del intent que detectó Dialogflow
  const intent = queryResult.intent.displayName;

  // Cantidad enviada por el usuario
  const cantidad = Number(queryResult.parameters.cantidad);

  // =====================================
  // OBTENER EL CARRITO ACTUAL
  // =====================================

  let totalCarrito = 0;

  let cantLabial = 0;
  let cantBase = 0;
  let cantIluminador = 0;
  let cantSombras = 0;
  let cantMascara = 0;

  // Buscar nuestro contexto del carrito
  const contextos = queryResult.outputContexts || [];

  const carritoContexto = contextos.find(contexto =>
    contexto.name.includes("carrito_context")
  );

  if (carritoContexto && carritoContexto.parameters) {

    const p = carritoContexto.parameters;

    totalCarrito = Number(p.totalCarrito) || 0;

    cantLabial = Number(p.cantLabial) || 0;
    cantBase = Number(p.cantBase) || 0;
    cantIluminador = Number(p.cantIluminador) || 0;
    cantSombras = Number(p.cantSombras) || 0;
    cantMascara = Number(p.cantMascara) || 0;
  }

  // =====================================
  // SI ES UN PRODUCTO
  // =====================================

  if (precios[intent]) {

    // Verificar que exista una cantidad
    if (!cantidad || cantidad < 1) {

      return res.json({
        fulfillmentText:
          "Por favor, indica una cantidad válida del producto que deseas."
      });
    }

    // =====================================
    // LÍMITE DE 5
    // =====================================

    if (cantidad > 5) {

      return res.json({
        fulfillmentText:
          "Lo siento, el límite es de 5 artículos del mismo producto. Por favor, indica una cantidad de 1 a 5."
      });
    }

    // =====================================
    // PRECIO DEL PRODUCTO
    // =====================================

    const precio = precios[intent];

    // Calcular subtotal
    const subtotal = cantidad * precio;

    // =====================================
    // ACTUALIZAR CANTIDAD DEL PRODUCTO
    // =====================================

    if (intent === "producto_labial") {
      cantLabial += cantidad;
    }

    if (intent === "producto_base") {
      cantBase += cantidad;
    }

    if (intent === "producto_iluminador") {
      cantIluminador += cantidad;
    }

    if (intent === "producto_sombras") {
      cantSombras += cantidad;
    }

    if (intent === "producto_mascara") {
      cantMascara += cantidad;
    }

    // =====================================
    // COMPROBAR QUE EL TOTAL DEL PRODUCTO
    // NO SUPERE 5
    // =====================================

    const nombreCantidad = cantidades[intent];

    let cantidadActual = 0;

    if (nombreCantidad === "cantLabial") {
      cantidadActual = cantLabial;
    }

    if (nombreCantidad === "cantBase") {
      cantidadActual = cantBase;
    }

    if (nombreCantidad === "cantIluminador") {
      cantidadActual = cantIluminador;
    }

    if (nombreCantidad === "cantSombras") {
      cantidadActual = cantSombras;
    }

    if (nombreCantidad === "cantMascara") {
      cantidadActual = cantMascara;
    }

    if (cantidadActual > 5) {

      return res.json({
        fulfillmentText:
          `Ya tienes ${cantidadActual - cantidad} ${nombres[intent]}. Solo puedes tener un máximo de 5 del mismo producto.`
      });
    }

    // =====================================
    // SUMAR AL CARRITO
    // =====================================

    totalCarrito += subtotal;

    // =====================================
    // GUARDAR EL CARRITO EN EL CONTEXTO
    // =====================================

    const session = req.body.session;

    const contextName =
      `${session}/contexts/carrito_context`;

    // =====================================
    // RESPUESTA PARA EL USUARIO
    // =====================================

    const respuesta =
      `Has seleccionado ${cantidad} ${nombres[intent]}. ` +
      `El precio por pieza es de $${precio.toFixed(2)} MXN. ` +
      `Tu subtotal es de $${subtotal.toFixed(2)} MXN. ` +
      `Tu carrito lleva $${totalCarrito.toFixed(2)} MXN. ` +
      `¿Deseas agregar otro producto?`;

    return res.json({

      fulfillmentText: respuesta,

      outputContexts: [
        {
          name: contextName,
          lifespanCount: 20,

          parameters: {

            totalCarrito: totalCarrito,

            cantLabial: cantLabial,
            cantBase: cantBase,
            cantIluminador: cantIluminador,
            cantSombras: cantSombras,
            cantMascara: cantMascara
          }
        }
      ]
    });
  }

  // =====================================
  // FINALIZAR COMPRA
  // =====================================

  if (intent === "finalizar_compra") {

    return res.json({

      fulfillmentText:
        `Tu total de compra es de $${totalCarrito.toFixed(2)} MXN. ¿Deseas confirmar tu compra?`,

      outputContexts: [
        {
          name: `${req.body.session}/contexts/carrito_context`,
          lifespanCount: 20,

          parameters: {

            totalCarrito: totalCarrito,

            cantLabial: cantLabial,
            cantBase: cantBase,
            cantIluminador: cantIluminador,
            cantSombras: cantSombras,
            cantMascara: cantMascara
          }
        }
      ]
    });
  }

  // =====================================
  // CONFIRMAR COMPRA
  // =====================================

  if (intent === "confirmar_compra") {

    return res.json({

      fulfillmentText:
        `¡Compra confirmada! El total de tu compra es de $${totalCarrito.toFixed(2)} MXN. ¡Gracias por tu compra!`
    });
  }

  // =====================================
  // RESPUESTA GENERAL
  // =====================================

  return res.json({
    fulfillmentText:
      "No pude identificar la acción que deseas realizar."
  });
});

// =====================================
// INICIAR SERVIDOR
// =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Webhook funcionando en el puerto ${PORT}`);
});
