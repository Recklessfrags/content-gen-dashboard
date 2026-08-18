export function assertTrackGeometry(trackGeometry) {
  if (trackGeometry.length === 0) {
    throw new Error("run track geometry skipped - unverified: no run track is present");
  }

  const failedGeometry = trackGeometry.find(
    (geometry) => geometry.count !== 11 || !geometry.allVisible,
  );
  if (failedGeometry) {
    throw new Error(
      `run track geometry failed at ${failedGeometry.viewportWidth}px: `
      + `${failedGeometry.count} nodes, bounds ${failedGeometry.minLeft}..${failedGeometry.maxRight}`,
    );
  }

  const failedHeight = trackGeometry.find(
    (geometry) => !Number.isFinite(geometry.minHeight)
      || !Number.isFinite(geometry.maxHeight)
      || Math.abs(geometry.minHeight - 44) > 0.5
      || Math.abs(geometry.maxHeight - 44) > 0.5,
  );
  if (failedHeight) {
    throw new Error(
      `run track height failed at ${failedHeight.viewportWidth}px: `
      + `node heights ${failedHeight.minHeight}..${failedHeight.maxHeight}px, expected 44px`,
    );
  }
}
