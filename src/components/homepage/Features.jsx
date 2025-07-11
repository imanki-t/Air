import React from 'react';

const FeatureCard = ({ icon, title, description, image, darkMode }) => (
    <div className={`p-6 rounded-xl transition-all duration-300 transform hover:scale-105 ${darkMode
        ? 'bg-gray-800 hover:shadow-lg hover:shadow-blue-900/20'
        : 'bg-white hover:shadow-xl hover:shadow-red-200/50'
        }`}>
        <div className={`w-12 h-12 rounded-md ${darkMode ? 'bg-blue-500/20' : 'bg-red-500/20'} flex items-center justify-center mb-4`}>
            {icon}
        </div>
        <div className="md:min-h-28">
            <h3 className="mb-2 text-xl font-semibold">{title}</h3>
            <p className="opacity-80">{description}</p>
        </div>
        <img src={image} alt={title} className="w-full h-64 md:h-56 mt-4 rounded-md object-cover" />
    </div>
);

const Features = ({ darkMode }) => {
    const featureData = [
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
            title: "Upload Files",
            description: "Quickly upload your documents, photos, and other files.",
            image: "/feature1.jpg"
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
            title: "Advance Resume",
            description: "Resume file upload, in case you refreshed it would help you.",
            image: "/feature2.jpg"
        },
        {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>,
            title: "Seamless Sync",
            description: "Effortlessly access your files across all your devices with real-time synchronization.",
            image: "/feature3.jpg"
        }
    ];

    return (
        <section className={`relative z-10 px-6 py-16 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="mx-auto max-w-7xl">
                <h2 className="text-3xl font-bold text-center">Key Features</h2>
                <p className="max-w-2xl mx-auto mt-4 text-center text-lg opacity-80">
                    Designed specifically for your personal needs
                </p>
                <div className="grid grid-cols-1 gap-8 mt-12 md:grid-cols-3">
                    {featureData.map((feature, index) => (
                        <FeatureCard key={index} {...feature} darkMode={darkMode} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
