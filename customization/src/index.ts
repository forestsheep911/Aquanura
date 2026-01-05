// Kintone Customization Entry Point

kintone.events.on('app.record.index.show', (event) => {
    console.log('Hello from Aquanura Customization!', event);
    return event;
});
