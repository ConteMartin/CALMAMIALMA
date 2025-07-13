import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const CourseModal = ({ course, isOpen, onClose, onPurchase }) => {
  const [courseDetails, setCourseDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    if (isOpen && course) {
      fetchCourseDetails();
    }
  }, [isOpen, course]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const details = await apiService.getCourseDetails(course.id);
      setCourseDetails(details);
    } catch (error) {
      console.error('Error fetching course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setPurchaseLoading(true);
      await apiService.purchaseCourse(course.id);
      onPurchase();
      onClose();
      alert('¡Curso comprado exitosamente!');
    } catch (error) {
      console.error('Error purchasing course:', error);
      alert('Error al comprar el curso. Intenta nuevamente.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-fondo-claro text-texto-principal-dark rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-acento-claro">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bodoni-moda font-medium">
              {course?.title || 'Cargando...'}
            </h2>
            <button
              onClick={onClose}
              className="text-texto-secundario-dark hover:text-texto-principal-dark text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : courseDetails ? (
            <div className="space-y-6">
              {/* Video Section */}
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={courseDetails.youtube_url ? 
                    courseDetails.youtube_url.replace('watch?v=', 'embed/') : 
                    'https://www.youtube.com/embed/dQw4w9WgXcQ'
                  }
                  title={courseDetails.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Course Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-bodoni-moda font-medium mb-3">
                    Información del Curso
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Duración:</strong> {courseDetails.duration}</p>
                    <p><strong>Nivel:</strong> {courseDetails.level}</p>
                    <p><strong>Modalidad:</strong> Online</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bodoni-moda font-medium mb-3">
                    Precio
                  </h3>
                  <div className="space-y-2">
                    {courseDetails.discounted_price ? (
                      <div>
                        <span className="text-2xl text-acento-claro font-raleway font-semibold">
                          ${courseDetails.discounted_price.toFixed(0)}
                        </span>
                        <span className="text-sm text-texto-secundario-dark line-through ml-2">
                          ${courseDetails.price.toFixed(0)}
                        </span>
                        <p className="text-xs text-texto-secundario-dark">
                          Descuento Premium (30% OFF)
                        </p>
                      </div>
                    ) : (
                      <span className="text-2xl text-acento-claro font-raleway font-semibold">
                        ${courseDetails.price.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Program Section */}
              <div>
                <h3 className="text-xl font-bodoni-moda font-medium mb-3">
                  Programa del Curso
                </h3>
                <div className="bg-gradient-main-sections p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-montserrat text-texto-principal-dark">
                    {courseDetails.program}
                  </pre>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xl font-bodoni-moda font-medium mb-3">
                  Descripción
                </h3>
                <p className="text-texto-secundario-dark font-montserrat">
                  {courseDetails.description}
                </p>
              </div>

              {/* Purchase Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                  className={`px-8 py-3 rounded-btn font-montserrat transition ${
                    purchaseLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-acento-claro hover:bg-gris-btn-hover'
                  } text-texto-principal-dark`}
                >
                  {purchaseLoading ? 'Procesando...' : 'Comprar Curso'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-texto-secundario-dark">
                No se pudieron cargar los detalles del curso.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseModal;