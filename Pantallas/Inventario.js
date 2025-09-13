import { useEffect, useState } from "react";
import {
    SafeAreaView, ScrollView, View, Text, TextInput,
    FlatList, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, Dimensions,
    RefreshControl  // <-- Importar RefreshControl
} from "react-native";
import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";

const { width } = Dimensions.get('window');

const Inventario = ({ route }) => {
    const [proveedorId, setProveedorId] = useState(null);
    const [productos, setProductos] = useState([]);
    const [refreshing, setRefreshing] = useState(false); // <-- Estado para refresh
    const [form, setForm] = useState({
        id_producto: null,
        nombre_producto: '',
        cantidad_producto: '',
        precio_producto: '',
        talla_producto: '',
        categoria_producto: ''
    });

    // Cargar sesión
    useEffect(() => {
        const loadSession = async () => {
            const session = await getSession();
            if (session?.id) {
                setProveedorId(session.id);
            } else if (route.params?.id_proveedor) {
                setProveedorId(route.params.id_proveedor);
            } else {
                Alert.alert("Error", "No se pudo identificar al proveedor");
            }
        };
        loadSession();
    }, []);

    // Obtener productos
    useEffect(() => {
        if (proveedorId) {
            obtenerProductos();
        }
    }, [proveedorId]);

    const obtenerProductos = async () => {
        console.log("Obteniendo productos para proveedor:", proveedorId);
        const { data, error } = await supabase
            .from("producto")
            .select("*")
            .eq("id_proveedor", proveedorId);

        if (error) {
            console.error("Error al obtener productos:", error.message);
            Alert.alert("Error", "No se pudieron cargar los productos");
        } else {
            setProductos(data || []);
        }
    };

    // Función para refrescar
    const onRefresh = async () => {
        setRefreshing(true);
        await obtenerProductos();
        setRefreshing(false);
    };

    // Resto de funciones: limpiarFormulario, validarFormulario, agregarOActualizarProducto, etc.
    // (quedan igual)
    
    const limpiarFormulario = () => {
        setForm({
            id_producto: null,
            nombre_producto: '',
            cantidad_producto: '',
            precio_producto: '',
            talla_producto: '',
            categoria_producto: ''
        });
    };

    const validarFormulario = () => {
        if (!form.nombre_producto.trim()) {
            Alert.alert("Error", "El nombre del producto es obligatorio");
            return false;
        }
        if (!form.cantidad_producto || isNaN(form.cantidad_producto) || parseInt(form.cantidad_producto) < 0) {
            Alert.alert("Error", "La cantidad debe ser un número válido");
            return false;
        }
        if (!form.precio_producto || isNaN(form.precio_producto) || parseFloat(form.precio_producto) < 0) {
            Alert.alert("Error", "El precio debe ser un número válido");
            return false;
        }
        if (!form.talla_producto.trim()) {
            Alert.alert("Error", "La talla del producto es obligatoria");
            return false;
        }
        if (!form.categoria_producto.trim()) {
            Alert.alert("Error", "La categoría del producto es obligatoria");
            return false;
        }
        return true;
    };

    const agregarOActualizarProducto = async () => {
        if (!validarFormulario()) return;

        const nuevoProducto = {
            nombre_producto: form.nombre_producto.trim(),
            cantidad_producto: parseInt(form.cantidad_producto),
            precio_producto: parseFloat(form.precio_producto),
            talla_producto: form.talla_producto.trim(),
            categoria_producto: form.categoria_producto.trim(),
            id_proveedor: proveedorId,
        };

        try {
            if (form.id_producto) {
                const { error } = await supabase
                    .from("producto")
                    .update(nuevoProducto)
                    .eq("id_producto", form.id_producto);
                if (error) throw error;
                Alert.alert("Éxito", "Producto actualizado correctamente");
            } else {
                const { error } = await supabase
                    .from("producto")
                    .insert(nuevoProducto);
                if (error) throw error;
                Alert.alert("Éxito", "Producto agregado correctamente");
            }

            await obtenerProductos(); // Refrescar lista
            limpiarFormulario();
        } catch (error) {
            console.error("Error al guardar producto:", error.message);
            Alert.alert("Error", "No se pudo guardar el producto");
        }
    };

    const eliminarProducto = async (id_producto) => {
        Alert.alert(
            "Confirmar eliminación",
            "¿Estás seguro de que deseas eliminar este producto?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("producto")
                                .delete()
                                .eq("id_producto", id_producto);
                            if (error) throw error;
                            Alert.alert("Éxito", "Producto eliminado correctamente");
                            await obtenerProductos(); // Refrescar
                        } catch (error) {
                            console.error("Error al eliminar producto:", error.message);
                            Alert.alert("Error", "No se pudo eliminar el producto");
                        }
                    }
                }
            ]
        );
    };

    const editarProducto = (producto) => {
        setForm({
            id_producto: producto.id_producto,
            nombre_producto: producto.nombre_producto,
            cantidad_producto: producto.cantidad_producto.toString(),
            precio_producto: producto.precio_producto.toString(),
            talla_producto: producto.talla_producto,
            categoria_producto: producto.categoria_producto
        });
    };

    const ProductCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.productName}>{item.nombre_producto}</Text>
                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={() => editarProducto(item)}
                    >
                        <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={() => eliminarProducto(item.id_producto)}
                    >
                        <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Cantidad:</Text>
                    <Text style={styles.value}>{item.cantidad_producto}</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Precio:</Text>
                    <Text style={styles.value}>${item.precio_producto}</Text>
                </View>
                
                {item.talla_producto && (
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Talla:</Text>
                        <Text style={styles.value}>{item.talla_producto}</Text>
                    </View>
                )}
                
                {item.categoria_producto && (
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Categoría:</Text>
                        <Text style={styles.value}>{item.categoria_producto}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeAreaView style={styles.container}>
                <ScrollView 
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh} 
                        />
                    }
                >
                    <Text style={styles.title}>Inventario</Text>

                    {productos.length > 0 ? (
                        <FlatList
                            data={productos}
                            renderItem={({ item }) => <ProductCard item={item} />}
                            keyExtractor={(item) => item.id_producto.toString()}
                            style={styles.productsList}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No hay productos registrados</Text>
                        </View>
                    )}

                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>
                            {form.id_producto ? "Editar Producto" : "Agregar Producto"}
                        </Text>

                        <TextInput 
                            style={styles.textInput} 
                            placeholder="Nombre del producto *" 
                            value={form.nombre_producto} 
                            onChangeText={text => setForm({ ...form, nombre_producto: text })}
                            placeholderTextColor="#999"
                        />
                        
                        <TextInput 
                            style={styles.textInput} 
                            placeholder="Cantidad *" 
                            value={form.cantidad_producto} 
                            keyboardType="numeric" 
                            onChangeText={text => setForm({ ...form, cantidad_producto: text })}
                            placeholderTextColor="#999"
                        />

                        <TextInput 
                            style={styles.textInput} 
                            placeholder="Precio *" 
                            value={form.precio_producto} 
                            keyboardType="decimal-pad" 
                            onChangeText={text => setForm({ ...form, precio_producto: text })}
                            placeholderTextColor="#999"
                        />
                        
                        <TextInput 
                            style={styles.textInput} 
                            placeholder="Talla*" 
                            value={form.talla_producto} 
                            onChangeText={text => setForm({ ...form, talla_producto: text })}
                            placeholderTextColor="#999"
                        />
                        
                        <TextInput 
                            style={styles.textInput} 
                            placeholder="Categoría*" 
                            value={form.categoria_producto} 
                            onChangeText={text => setForm({ ...form, categoria_producto: text })}
                            placeholderTextColor="#999"
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity 
                                style={styles.primaryButton} 
                                onPress={agregarOActualizarProducto}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {form.id_producto ? "Actualizar" : "Agregar"}
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.secondaryButton} 
                                onPress={limpiarFormulario}
                            >
                                <Text style={styles.secondaryButtonText}>Limpiar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    
    scrollView: {
        flex: 1,
        paddingHorizontal: 16
    },

    title: { 
        fontSize: 28, 
        textAlign: "center", 
        marginVertical: 20, 
        fontWeight: 'bold',
        color: '#2c3e50'
    },

    productsList: {
        marginBottom: 20
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },

    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
        marginRight: 10
    },

    actionButtons: {
        flexDirection: 'row',
        gap: 8
    },

    editButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },

    editButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },

    deleteButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },

    deleteButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },

    cardContent: {
        gap: 8
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },

    label: {
        fontSize: 14,
        color: '#7f8c8d',
        fontWeight: '500'
    },

    value: {
        fontSize: 14,
        color: '#2c3e50',
        fontWeight: '600'
    },

    emptyState: {
        alignItems: 'center',
        paddingVertical: 40
    },

    emptyStateText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center'
    },

    formContainer: { 
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },

    formTitle: { 
        fontSize: 20, 
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#2c3e50'
    },

    textInput: { 
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderRadius: 8, 
        padding: 12, 
        marginBottom: 16, 
        fontSize: 16,
        backgroundColor: '#f8f9fa',
        color: '#2c3e50'
    },

    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8
    },

    primaryButton: {
        backgroundColor: '#27ae60',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center'
    },

    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },

    secondaryButton: {
        backgroundColor: '#95a5a6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center'
    },

    secondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    }
});

export default Inventario;