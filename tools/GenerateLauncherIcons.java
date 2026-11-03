import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Path2D;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

public final class GenerateLauncherIcons {
    private static void drawIcon(Graphics2D g, int size) {
        double scale = size / 108.0;
        g.scale(scale, scale);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);

        g.setColor(new Color(15, 118, 110));
        g.fillRoundRect(0, 0, 108, 108, 24, 24);

        g.setColor(new Color(248, 245, 236));
        g.fillOval(14, 14, 80, 80);
        g.setColor(new Color(245, 158, 11));
        g.setStroke(new BasicStroke(2.2f));
        g.drawOval(15, 15, 78, 78);

        Path2D north = new Path2D.Double();
        north.moveTo(54, 23); north.lineTo(64, 52); north.lineTo(54, 47); north.lineTo(44, 52); north.closePath();
        g.setColor(new Color(245, 158, 11)); g.fill(north);

        Path2D south = new Path2D.Double();
        south.moveTo(54, 85); south.lineTo(44, 56); south.lineTo(54, 61); south.lineTo(64, 56); south.closePath();
        g.setColor(new Color(15, 118, 110)); g.fill(south);

        Path2D west = new Path2D.Double();
        west.moveTo(23, 54); west.lineTo(52, 44); west.lineTo(47, 54); west.lineTo(52, 64); west.closePath();
        Path2D east = new Path2D.Double();
        east.moveTo(85, 54); east.lineTo(56, 64); east.lineTo(61, 54); east.lineTo(56, 44); east.closePath();
        g.setColor(new Color(91, 155, 147)); g.fill(west); g.fill(east);

        g.setColor(new Color(15, 118, 110)); g.fillOval(48, 48, 12, 12);
        g.setColor(new Color(248, 245, 236)); g.fillOval(51, 51, 6, 6);
    }

    public static void main(String[] args) throws Exception {
        String root = args[0];
        int[] sizes = {48, 72, 96, 144, 192};
        String[] densities = {"mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"};
        for (int i = 0; i < sizes.length; i++) {
            BufferedImage image = new BufferedImage(sizes[i], sizes[i], BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = image.createGraphics();
            drawIcon(g, sizes[i]);
            g.dispose();
            File out = new File(root + "/mipmap-" + densities[i] + "/ic_launcher.png");
            ImageIO.write(image, "png", out);
            ImageIO.write(image, "png", new File(root + "/mipmap-" + densities[i] + "/ic_launcher_round.png"));
        }
    }
}
