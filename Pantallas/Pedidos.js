import React, { useEffect, useState } from "react";
import {
    View, Text, FlatList, SafeAreaView, ScrollView,
    StyleSheet, Alert, RefreshControl, TouchableOpacity, StatusBar
} from "react-native";
import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";

const Pedidos = ({ route }) => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sessionData, setSessionData] = useState(null);
    const [procesandoEstados, setProcesandoEstados] = useState(new Set());

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const session = await getSession();
                if (!session) {
                    Alert.alert("Error", "No hay sesión activa");
                    setLoading(false);
                    return;
                }
                setSessionData(session);
                await cargarPedidosProveedor(session.id);
            } catch (error) {
                console.error("Error al cargar datos:", error);
                Alert.alert("Error", "Error al cargar pedidos: " + error.message);
                setLoading(false);
            }
        };
        cargarDatos();
    }, []);

    const cargarPedidosProveedor = async (idProveedor) => {
        try {
            // Consulta actualizada para incluir los nuevos campos
            const { data: pedidosData, error: pedidosError } = await supabase
                .from("pedidos")
                .select(`
                    id_pedido,
                    numero_pedido_proveedor,
                    codigo_seguimiento,
                    fecha_creacion,
                    fecha_actualizacion,
                    estado,
                    total,
                    notas,
                    id_cliente
                `)
                .eq("id_proveedor", idProveedor)
                .order("numero_pedido_proveedor", { ascending: false }); // Ordenar por número de pedido del proveedor

            if (pedidosError) throw new Error(pedidosError.message);

            if (!pedidosData || pedidosData.length === 0) {
                setPedidos([]);
                setLoading(false);
                return;
            }

            // Clientes
            const clientesIds = [...new Set(pedidosData.map((p) => p.id_cliente))];
            const { data: clientesData } = await supabase
                .from("clientes")
                .select("id_cliente, nombre_cliente, telefono_cliente")
                .in("id_cliente", clientesIds);

            const clientesMap = {};
            if (clientesData) {
                clientesData.forEach((cliente) => {
                    clientesMap[cliente.id_cliente] = cliente;
                });
            }

            // Detalles
            const pedidosIds = pedidosData.map((p) => p.id_pedido);
            const { data: detallesData } = await supabase
                .from("detalle_pedido")
                .select("id_pedido, cantidad, precio_unitario, subtotal, talla, id_producto")
                .in("id_pedido", pedidosIds);

            let productosMap = {};
            if (detallesData && detallesData.length > 0) {
                const productosIds = [...new Set(detallesData.map((d) => d.id_producto))];
                const { data: productosData } = await supabase
                    .from("producto")
                    .select("id_producto, nombre_producto, categoria_producto")
                    .in("id_producto", productosIds);

                if (productosData) {
                    productosData.forEach((producto) => {
                        productosMap[producto.id_producto] = producto;
                    });
                }
            }

            const pedidosCompletos = pedidosData.map((pedido) => {
                const cliente = clientesMap[pedido.id_cliente] || {
                    nombre_cliente: "Cliente no encontrado",
                    telefono_cliente: "N/A",
                };

                const detallesPedido = detallesData
                    ? detallesData
                        .filter((d) => d.id_pedido === pedido.id_pedido)
                        .map((detalle) => ({
                            ...detalle,
                            producto: productosMap[detalle.id_producto] || {
                                nombre_producto: "Producto no encontrado",
                                categoria_producto: "N/A",
                            },
                        }))
                    : [];

                const totalProductos = detallesPedido.reduce((sum, d) => sum + d.cantidad, 0);

                return {
                    ...pedido,
                    cliente,
                    detalles: detallesPedido,
                    total_productos: totalProductos,
                };
            });

            setPedidos(pedidosCompletos);
            setLoading(false);
        } catch (error) {
            console.error("Error en cargarPedidosProveedor:", error);
            Alert.alert("Error", error.message);
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (sessionData) {
            await cargarPedidosProveedor(sessionData.id);
        }
        setRefreshing(false);
    };

    const restaurarStock = async (detallesPedido) => {
        try {
            console.log('Restaurando stock para pedido cancelado...');

            for (const detalle of detallesPedido) {
                // Obtener stock actual del producto
                const { data: productoActual, error: errorConsulta } = await supabase
                    .from('producto')
                    .select('cantidad_producto')
                    .eq('id_producto', detalle.id_producto)
                    .single();

                if (errorConsulta) {
                    console.error(`Error consultando producto ${detalle.id_producto}:`, errorConsulta);
                    continue;
                }

                // Calcular nuevo stock (restaurar la cantidad que se había descontado)
                const stockActual = productoActual.cantidad_producto || 0;
                const nuevoStock = stockActual + detalle.cantidad;

                // Actualizar stock en la base de datos
                const { error: errorActualizacion } = await supabase
                    .from('producto')
                    .update({ cantidad_producto: nuevoStock })
                    .eq('id_producto', detalle.id_producto);

                if (errorActualizacion) {
                    console.error(`Error actualizando stock del producto ${detalle.id_producto}:`, errorActualizacion);
                } else {
                    console.log(`Stock restaurado para producto ${detalle.id_producto}: ${stockActual} -> ${nuevoStock}`);
                }
            }
        } catch (error) {
            console.error('Error general al restaurar stock:', error);
        }
    };

    const actualizarEstadoPedido = async (idPedido, nuevoEstado, detallesPedido, numeroPedido, codigoSeguimiento) => {
        // Verificar si ya se está procesando este pedido
        if (procesandoEstados.has(idPedido)) {
            Alert.alert("Procesando", "Este pedido ya se está procesando...");
            return;
        }

        // Agregar el pedido a la lista de procesamiento
        setProcesandoEstados(prev => new Set([...prev, idPedido]));

        try {
            // Si el pedido se cancela, restaurar el stock
            if (nuevoEstado === 'cancelado') {
                await restaurarStock(detallesPedido);
            }

            const { error } = await supabase
                .from("pedidos")
                .update({
                    estado: nuevoEstado,
                    fecha_actualizacion: new Date().toISOString()
                })
                .eq("id_pedido", idPedido);

            if (error) throw error;

            const mensajeAccion = nuevoEstado === 'completado' ? 'confirmado' : 'cancelado';
            const mensajeStock = nuevoEstado === 'cancelado' ? ' y el stock ha sido restaurado' : '';

            Alert.alert(
                "Éxito",
                `Pedido #${numeroPedido} (${codigoSeguimiento}) ${mensajeAccion} correctamente${mensajeStock}`
            );

            await cargarPedidosProveedor(sessionData.id);
        } catch (error) {
            console.error("Error al actualizar pedido:", error);
            Alert.alert("Error", "No se pudo actualizar el pedido: " + error.message);
        } finally {
            // Remover el pedido de la lista de procesamiento
            setProcesandoEstados(prev => {
                const newSet = new Set(prev);
                newSet.delete(idPedido);
                return newSet;
            });
        }
    };

    const formatearFecha = (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatearMoneda = (amount) => `$${parseFloat(amount || 0).toFixed(2)}`;

    const obtenerEstiloEstado = (estado) => {
        switch (estado?.toLowerCase()) {
            case 'completado':
                return {
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    borderColor: '#c3e6cb',
                    texto: '✅ CONFIRMADO'
                };
            case 'cancelado':
                return {
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    borderColor: '#f5c6cb',
                    texto: '❌ CANCELADO'
                };
            case 'pendiente':
            default:
                return {
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    borderColor: '#ffeaa7',
                    texto: '⏳ PENDIENTE'
                };
        }
    };

    const mostrarBotones = (estado) => {
        return estado?.toLowerCase() === 'pendiente';
    };

    const renderDetallesPedido = (pedido) => {
        const estiloEstado = obtenerEstiloEstado(pedido.estado);
        const deberiasMostrarBotones = mostrarBotones(pedido.estado);
        const esProcesando = procesandoEstados.has(pedido.id_pedido);

        return (
            <View style={styles.detallesContainer}>
                <View style={styles.headerPedido}>
                    <View style={styles.tituloPedido}>
                        <Text style={styles.detallesTitle}>
                            Pedido #{pedido.numero_pedido_proveedor || pedido.id_pedido}
                        </Text>
                        {pedido.codigo_seguimiento && (
                            <Text style={styles.codigoSeguimiento}>
                                📊 {pedido.codigo_seguimiento}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.estadoBadge, {
                        backgroundColor: estiloEstado.backgroundColor,
                        borderColor: estiloEstado.borderColor
                    }]}>
                        <Text style={[styles.estadoTexto, { color: estiloEstado.color }]}>
                            {estiloEstado.texto}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoPedido}>
                    <Text style={styles.infoTexto}>
                        👤 Cliente: {pedido.cliente.nombre_cliente}
                    </Text>
                    <Text style={styles.infoTexto}>
                        📞 Teléfono: {pedido.cliente.telefono_cliente}
                    </Text>
                    <Text style={styles.infoTexto}>
                        📅 Creado: {formatearFecha(pedido.fecha_creacion)}
                    </Text>
                    {pedido.fecha_actualizacion && (
                        <Text style={styles.infoTexto}>
                            🔄 Actualizado: {formatearFecha(pedido.fecha_actualizacion)}
                        </Text>
                    )}

                    <Text style={styles.infoTexto}>
                        💰 Total: {formatearMoneda(pedido.total)}
                    </Text>
                </View>

                <Text style={styles.productosTitle}>Productos:</Text>
                {pedido.detalles && pedido.detalles.length > 0 ? (
                    pedido.detalles.map((detalle, index) => (
                        <View key={index} style={styles.detalleRow}>
                            <Text style={styles.detalleProducto}>• {detalle.producto.nombre_producto}</Text>
                            <Text style={styles.detalleInfo}>
                                Cantidad: {detalle.cantidad} | Talla: {detalle.talla} | Precio:{" "}
                                {formatearMoneda(detalle.precio_unitario)} | Subtotal:{" "}
                                {formatearMoneda(
                                    detalle.subtotal || detalle.cantidad * detalle.precio_unitario
                                )}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyDetalles}>Sin productos</Text>
                )}

                {/* Mostrar notas si existen */}
                {pedido.notas && (
                    <View style={styles.notasContainer}>
                        <Text style={styles.notasTitle}>📝 Notas:</Text>
                        <Text style={styles.notasTexto}>{pedido.notas}</Text>
                    </View>
                )}

                {/* Mostrar botones solo si el estado es pendiente */}
                {deberiasMostrarBotones && (
                    <View style={styles.botonesContainer}>
                        <TouchableOpacity
                            style={[
                                styles.boton,
                                { backgroundColor: "#27ae60" },
                                esProcesando && styles.botonDeshabilitado
                            ]}
                            onPress={() => actualizarEstadoPedido(
                                pedido.id_pedido,
                                "completado",
                                pedido.detalles,
                                pedido.numero_pedido_proveedor,
                                pedido.codigo_seguimiento
                            )}
                            disabled={esProcesando}
                        >
                            <Text style={styles.botonTexto}>
                                {esProcesando ? "Procesando..." : "Confirmar"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.boton,
                                { backgroundColor: "#e74c3c" },
                                esProcesando && styles.botonDeshabilitado
                            ]}
                            onPress={() => actualizarEstadoPedido(
                                pedido.id_pedido,
                                "cancelado",
                                pedido.detalles,
                                pedido.numero_pedido_proveedor,
                                pedido.codigo_seguimiento
                            )}
                            disabled={esProcesando}
                        >
                            <Text style={styles.botonTexto}>
                                {esProcesando ? "Procesando..." : "Cancelar"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Mostrar información adicional para estados finalizados */}
                {!deberiasMostrarBotones && (
                    <View style={styles.infoFinalizada}>
                        <Text style={styles.infoFinalizadaTexto}>
                            {pedido.estado?.toLowerCase() === 'completado'
                                ? "Este pedido ha sido confirmado y procesado."
                                : "Este pedido ha sido cancelado y el stock fue restaurado."
                            }
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.title}>Cargando pedidos...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar
                barStyle="dark-content" // o "light-content" según el fondo
                backgroundColor="#f8f9fa" // mismo color que tu fondo
            />

            <Text style={styles.title}>Pedidos Recibidos</Text>
            {pedidos.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No tienes pedidos registrados</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.detallesSection}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {pedidos.map((pedido) => (
                        <View key={`pedido-${pedido.id_pedido}`}>{renderDetallesPedido(pedido)}</View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 30, backgroundColor: "#f8f9fa" },
    title: { fontSize: 24, textAlign: "center", marginBottom: 15, fontWeight: "bold", color: "#2c3e50" },
    emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    emptyText: { fontSize: 16, color: "#7f8c8d", textAlign: "center" },
    detallesSection: { marginTop: 20 },
    detallesContainer: {
        backgroundColor: "#fff",
        marginVertical: 8,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#3498db",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 1,
    },
    headerPedido: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    tituloPedido: {
        flex: 1,
    },
    detallesTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#2c3e50"
    },
    codigoSeguimiento: {
        fontSize: 12,
        color: "#7f8c8d",
        marginTop: 2,
        fontFamily: 'monospace'
    },
    estadoBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginLeft: 10,
    },
    estadoTexto: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    infoPedido: {
        marginBottom: 10,
        paddingLeft: 5,
    },
    infoTexto: {
        fontSize: 13,
        color: "#555",
        marginBottom: 2,
    },
    productosTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#2c3e50",
        marginBottom: 5,
    },
    detalleRow: { marginBottom: 6, paddingLeft: 10 },
    detalleProducto: { fontSize: 13, fontWeight: "600", color: "#34495e" },
    detalleInfo: { fontSize: 11, color: "#7f8c8d" },
    emptyDetalles: { fontSize: 13, color: "#95a5a6", fontStyle: "italic" },
    notasContainer: {
        marginTop: 10,
        padding: 8,
        backgroundColor: "#f8f9fa",
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: "#17a2b8",
    },
    notasTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2c3e50",
        marginBottom: 3,
    },
    notasTexto: {
        fontSize: 11,
        color: "#555",
        fontStyle: "italic",
    },
    botonesContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#eee"
    },
    boton: {
        padding: 12,
        borderRadius: 6,
        width: "40%",
        alignItems: "center"
    },
    botonTexto: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 13
    },
    botonDeshabilitado: {
        opacity: 0.6,
    },
    infoFinalizada: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        alignItems: 'center',
    },
    infoFinalizadaTexto: {
        fontSize: 12,
        color: "#666",
        fontStyle: 'italic',
        textAlign: 'center',
    },
});

export default Pedidos;