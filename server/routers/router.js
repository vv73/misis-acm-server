module.exports = {
    partials: compileStaticTemplate,
    index: require('./index')
};

function compileStaticTemplate(req, res) {
    var filename = req.params.filename;
    if (!filename) return;
    res.render('../../app/partials/' + filename.replace(/(\.htm|\.html)$/i, ''));
}