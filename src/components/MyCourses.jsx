import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const MyCourses = ({ isLoggedIn }) => {
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      fetchPurchasedCourses();
    }
  }, [isLoggedIn]);

  const fetchPurchasedCourses = async () => {
    try {
      setLoading(true);
      const courses = await apiService.getPurchasedCourses();
      setPurchasedCourses(courses);
    } catch (error) {
      console.error('Error fetching purchased courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="text-center py-8">
        <p className="text-texto-secundario-dark">
          Necesitas iniciar sesión para ver tus cursos.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-4xl font-bodoni-moda font-light text-texto-principal-dark text-center mb-16">
        Mis Cursos
      </h2>
      
      {purchasedCourses.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-6">
            <i className="fas fa-graduation-cap text-6xl text-acento-claro"></i>
          </div>
          <h3 className="text-xl font-bodoni-moda font-medium text-texto-principal-dark mb-4">
            No tienes cursos comprados
          </h3>
          <p className="text-texto-secundario-dark font-montserrat mb-6">
            Explora nuestra selección de cursos especializados para comenzar tu aprendizaje.
          </p>
          <a
            href="#courses"
            className="bg-acento-claro text-texto-principal-dark px-8 py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
          >
            Ver Cursos Disponibles
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {purchasedCourses.map(course => (
            <div key={course.id} className="bg-gradient-main-sections p-6 rounded-2xl shadow-lg text-texto-principal-dark">
              <div className="text-center mb-6">
                <img 
                  src={course.image_url || 'https://placehold.co/200x150/e0e0e0/333333?text=Curso'} 
                  alt={course.title} 
                  className="w-full h-32 object-cover rounded-lg mx-auto mb-4"
                />
                <h3 className="text-xl font-bodoni-moda font-medium">{course.title}</h3>
                <p className="text-sm text-texto-secundario-dark font-montserrat mt-1">{course.level}</p>
              </div>
              
              <p className="font-montserrat mb-4 text-texto-secundario-dark text-sm">{course.description}</p>
              
              <div className="mb-4">
                <p className="text-sm text-texto-secundario-dark font-montserrat">
                  Duración: {course.duration}
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => alert(`Acceder al curso: ${course.title} (funcionalidad en desarrollo)`)}
                  className="flex-1 bg-acento-claro text-texto-principal-dark py-2 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
                >
                  Acceder
                </button>
                <button
                  onClick={() => alert(`Materiales del curso: ${course.title} (funcionalidad en desarrollo)`)}
                  className="flex-1 bg-fondo-oscuro text-texto-claro-white py-2 rounded-btn hover:bg-gray-600 transition font-montserrat"
                >
                  Materiales
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-12 p-8 bg-fondo-oscuro text-texto-claro-white rounded-2xl text-center">
        <h3 className="text-2xl font-bodoni-moda font-medium mb-4">
          ¿Necesitas ayuda con tus cursos?
        </h3>
        <p className="font-montserrat mb-6">
          Nuestro equipo está aquí para apoyarte en tu viaje de aprendizaje.
        </p>
        <a
          href="#contact"
          className="bg-acento-claro text-texto-principal-dark px-8 py-3 rounded-btn hover:bg-gris-btn-hover transition font-montserrat"
        >
          Contáctanos
        </a>
      </div>
    </div>
  );
};

export default MyCourses;