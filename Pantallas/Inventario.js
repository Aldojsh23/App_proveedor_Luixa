import { useEffect, useState } from "react";
import {
    SafeAreaView, ScrollView, View, Text, TextInput,
    FlatList, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, Dimensions,
    RefreshControl, Image, ActivityIndicator
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { supabase } from "../lib/supabase";
import { getSession } from "../lib/session";
const { width } = Dimensions.get('window');

const Inventario = ({ route, navigation }) => {
    const [proveedorId, setProveedorId] = useState(null);
    const [productos, setProductos] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        id_producto: null,
        nombre_producto: '',
        cantidad_producto: '',
        precio_producto: '',
        talla_producto: '',
        categoria_producto: '',
        imagen_url: null,
        imagen_local: null // Para preview local
    });

    // Solicitar permisos de la galería
    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Permisos necesarios',
                        'Se necesitan permisos para acceder a la galería de imágenes'
                    );
                }
            }
        })();
    }, []);

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
            console.log("Productos obtenidos:", data);

            // Procesar las URLs de imagen para corregir formato incorrecto
            const productosCorregidos = data?.map(producto => {
                let imagenUrl = producto.imagen_url;

                // Si la URL es un JSON string, extraer la URL real
                if (imagenUrl && typeof imagenUrl === 'string' && imagenUrl.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(imagenUrl);
                        imagenUrl = parsed.publicURL || parsed.publicUrl || null;
                        console.log(`URL corregida para ${producto.nombre_producto}:`, imagenUrl);
                    } catch (e) {
                        console.log('Error parseando URL:', e);
                    }
                }

                return {
                    ...producto,
                    imagen_url: imagenUrl
                };
            });

            // Verificar si hay imágenes
            productosCorregidos?.forEach((producto, index) => {
                console.log(`Producto ${index + 1} - ${producto.nombre_producto}:`, {
                    tiene_imagen: !!producto.imagen_url,
                    url: producto.imagen_url
                });
            });

            setProductos(productosCorregidos || []);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await obtenerProductos();
        setRefreshing(false);
    };

    // Eliminar imagen del storage
    const eliminarImagenStorage = async (imagenUrl) => {
        if (!imagenUrl) return;

        try {
            // Extraer el path de la URL
            const urlParts = imagenUrl.split('/productos/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1];
                await supabase.storage
                    .from('productos')
                    .remove([filePath]);
            }
        } catch (error) {
            console.error('Error al eliminar imagen del storage:', error);
        }
    };

    const limpiarFormulario = () => {
        setForm({
            id_producto: null,
            nombre_producto: '',
            cantidad_producto: '',
            precio_producto: '',
            talla_producto: '',
            categoria_producto: '',
            imagen_url: null,
            imagen_local: null
        });
    };

    const eliminarProducto = async (id_producto, imagen_url) => {
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
                            // Eliminar imagen del storage si existe
                            if (imagen_url) {
                                await eliminarImagenStorage(imagen_url);
                            }

                            const { error } = await supabase
                                .from("producto")
                                .delete()
                                .eq("id_producto", id_producto);
                            if (error) throw error;
                            Alert.alert("Éxito", "Producto eliminado correctamente");
                            await obtenerProductos();
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

        navigation.navigate("Product_add", { producto})

        setForm({
            id_producto: producto.id_producto,
            nombre_producto: producto.nombre_producto,
            cantidad_producto: producto.cantidad_producto.toString(),
            precio_producto: producto.precio_producto.toString(),
            talla_producto: producto.talla_producto,
            categoria_producto: producto.categoria_producto,
            imagen_url: producto.imagen_url,
            imagen_local: producto.imagen_url
        });
    };

    const ProductCard = ({ item }) => (
        <View style={styles.card}>
            {/* Imagen del producto o placeholder */}
            <View style={styles.imageContainer}>
                {item.imagen_url ? (
                    <Image
                        source={{ uri: item.imagen_url }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.placeholderIcon}>📦</Text>
                        <Text style={styles.placeholderText}>Sin imagen</Text>
                    </View>
                )}
            </View>

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
                        onPress={() => eliminarProducto(item.id_producto, item.imagen_url)}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                        <Text style={styles.title}>Inventario</Text>
                        <TouchableOpacity
                            style={styles.topRightButton}
                            onPress={() => navigation.navigate("Product_add")}
                        >
                            <Text style={styles.topRightButtonText}>Agregar</Text>
                        </TouchableOpacity>
                    </View>

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

                    
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingTop: 10
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

    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden'
    },

    productImage: {
        width: '100%',
        height: '100%'
    },

    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ecf0f1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#bdc3c7',
        borderStyle: 'dashed',
        borderRadius: 8
    },

    placeholderIcon: {
        fontSize: 48,
        marginBottom: 8
    },

    placeholderText: {
        fontSize: 14,
        color: '#95a5a6',
        fontWeight: '600'
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

    imageSection: {
        marginBottom: 20
    },

    imageLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 10
    },

    imagePickerButton: {
        backgroundColor: '#3498db',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2980b9',
        borderStyle: 'dashed'
    },

    imagePickerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },

    imagePreviewContainer: {
        position: 'relative',
        width: '100%',
        height: 250,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
    },

    imagePreview: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ecf0f1'
    },

    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#e74c3c',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },

    removeImageText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 18
    },

    changeImageButton: {
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: [{ translateX: -60 }],
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },

    changeImageText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
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
    },

    buttonDisabled: {
        opacity: 0.6
    },

    topRightButton: {
        backgroundColor: '#2980b9',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    topRightButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default Inventario;