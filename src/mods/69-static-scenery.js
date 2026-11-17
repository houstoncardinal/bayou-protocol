/* ===== Bayou Protocol mod: static scenery costs no matrix updates ===== */
// three.js recomputes every object's world matrix every frame (each object composes its own and passes the
// change down), whether it ever moves or not. On Blackwater that was the largest CPU cost of a frame: about
// 6,000 objects, a third of them the vegetation layer's trees (each a level-of-detail object with its meshes),
// none of which ever move. Their matrices are now worked out once when the layer is built; their level of
// detail still switches (that only changes which mesh is visible). The prison's own scenery does the same
// (65-prison-view.js).
function __freezeStatic(g) {
  g.updateMatrixWorld(!0);
  g.traverse((o) => {
    if (o === g || o.userData.dyn) return;
    o.matrixAutoUpdate = !1;
    o.matrixWorldAutoUpdate = !1;
  });
  return g;
}
{
  const coreVeg = __vegBuild;
  __vegBuild = function (m) {
    const g = coreVeg.apply(this, arguments);
    try {
      __freezeStatic(g);
    } catch (e) {}
    return g;
  };
}
