# posvental

Base inicial para crear un **punto de venta**.

## Alcance del MVP

El primer entregable del punto de venta debe cubrir:

1. **Catálogo de productos**
   - Alta de producto
   - Precio de venta
   - Existencia inicial
2. **Venta**
   - Agregar productos al ticket
   - Calcular subtotal, impuestos y total
   - Registrar método de pago
3. **Inventario**
   - Descontar existencias al confirmar una venta
4. **Corte básico**
   - Total vendido por día
   - Número de tickets

## Flujo recomendado

1. Capturar productos.
2. Iniciar ticket.
3. Escanear/seleccionar productos.
4. Confirmar pago.
5. Guardar ticket y actualizar inventario.

## Próximos pasos técnicos

- Definir stack (web o escritorio).
- Modelar entidades: `Producto`, `Ticket`, `TicketDetalle`, `Pago`.
- Implementar pruebas para cálculo de totales e inventario.
